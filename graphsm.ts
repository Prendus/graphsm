import {
    parse,
    graphql,
    buildSchema,
    GraphQLScalarType,
    GraphQLObjectType,
    print
} from 'graphql';

import {createStore, applyMiddleware} from 'redux';

let initialLocalState = {
    GRAPH_SM_STATE: true
};
let remoteEndpoint = null;
let localSchema = null;
let localSchemaString = null;
let localResolvers = null;
let store = null;
let reduxMiddlewares = [];

export const Any = new GraphQLScalarType({
    name: 'Any',
    serialize: (value) => value
});

export function GraphSMInit(options) {
    initialLocalState = Object.keys(options).includes('initialLocalState') ? {
        ...initialLocalState,
        ...options.initialLocalState
    } : initialLocalState;
    remoteEndpoint = Object.keys(options).includes('remoteEndpoint') ? options.remoteEndpoint : remoteEndpoint;
    localSchemaString = Object.keys(options).includes('localSchema') ? options.localSchema : localSchemaString; //TODO we might want to throw an error here to make it easy for the user
    localSchema = buildSchema(localSchemaString);
    localResolvers = Object.keys(options).includes('localResolvers') ? prepareLocalResolvers(options.localResolvers) : localResolvers;
    reduxMiddlewares = Object.keys(options).includes('reduxMiddlewares') ? options.reduxMiddlewares : reduxMiddlewares;
    store = prepareStore(initialLocalState, reduxMiddlewares);
}

export async function execute(queryString, pipelineFunctions, userToken) {
    //TODO redo all of this functionally
    const ast = parse(queryString);

    let previousResult = {};
    for (let i=0; i < ast.definitions.length; i++) {
        const definition = ast.definitions[i];
        const name = definition.name.value;
        const variables = await pipelineFunctions[name](previousResult);
        const partialAST = {
            ...ast,
            definitions: [definition]
        };
        const localAST = removeRemoteQueries(partialAST, localResolvers);
        const remoteAST = removeLocalQueries(partialAST, localResolvers);

        const localResult = localAST ? await graphql(localSchema, print(localAST), localResolvers, null, variables, name) : {};
        const remoteResult = remoteAST ? await executeRemoteQuery(remoteEndpoint, print(remoteAST), variables, userToken) : {};

        //TODO somehow combine the assignments below
        previousResult = {
            ...previousResult,
            ...localResult.data && {
                data: {
                    ...previousResult.data,
                    ...localResult.data
                }
            },
            ...localResult.errors && {
                errors: {
                    ...previousResult.errors,
                    ...localResult.errors
                }
            }
        };

        //TODO somehow combine the assignments below
        previousResult = {
            ...previousResult,
            ...remoteResult.data && {
                data: {
                    ...previousResult.data,
                    ...remoteResult.data
                }
            },
            ...remoteResult.errors && {
                errors: {
                    ...previousResult.errors,
                    ...remoteResult.errors
                }
            }
        };
    }

    return previousResult;
}

export function subscribe(callback) {
    return store.subscribe(() => {
        callback(store.getState());
    });
}

export function addIsTypeOf(abstractName, concreteName, isTypeOf) {
    //TODO this is really bad to do, depending on a private API, but I don't see any official way of doing this dynamically
    const concreteTypeObject = localSchema._implementations[abstractName].filter((concreteTypeObject) => {
        return concreteTypeObject.name === concreteName;
    })[0];
    concreteTypeObject.isTypeOf = isTypeOf;
}

export function extendSchema(schemaExtension) {
    localSchemaString = localSchemaString + schemaExtension;
    let newSchema = buildSchema(localSchemaString);
    copyIsTypeOfs(localSchema, newSchema);
    localSchema = newSchema;
}

// for some reason trying to make an immutable copy with object spread results in graphql-js not recognizing the returned schema as a schema. That's why I am mutating directly
function copyIsTypeOfs(oldSchema, newSchema) {
    Object.keys(newSchema._implementations).forEach((newAbstractImplementationKey) => {
        let newAbstractImplementationValue = newSchema._implementations[newAbstractImplementationKey];
        newAbstractImplementationValue.forEach((newConcreteImplementation, index) => {
            const oldAbstractImplementation = oldSchema._implementations[newAbstractImplementationKey];
            const oldConcreteImplementation = oldAbstractImplementation ? oldAbstractImplementation[index] : null;
            if (oldConcreteImplementation) {
                newConcreteImplementation.isTypeOf = oldConcreteImplementation.isTypeOf;
            }
        });
    });

    // TODO this is how it would be done immutably, perhaps open an issue on graphql-js and figure out why this doesn't work. This is all private implementation details, so I shouldn't be doing this anyway
    // perhaps ask for an official way to dynamically add isTypeOf functions to types
    // return {
    //     ...newSchema,
    //     _implementations: Object.keys(newSchema._implementations).reduce((result, newAbstractImplementationKey) => {
    //         const newAbstractImplementationValue = newSchema._implementations[newAbstractImplementationKey];
    //         return {
    //             ...result,
    //             [newAbstractImplementationKey]: newAbstractImplementationValue.map((newConcreteImplementation, index) => {
    //                 const oldAbstractImplementation = oldSchema._implementations[newAbstractImplementationKey];
    //                 const oldConcreteImplementation = oldAbstractImplementation ? oldAbstractImplementation[index] : null;
    //                 return {
    //                     ...newConcreteImplementation,
    //                     isTypeOf: oldConcreteImplementation ? oldConcreteImplementation.isTypeOf : newConcreteImplementation.isTypeOf
    //                 };
    //             })
    //         };
    //     }, {})
    // };
}

function prepareLocalResolvers(rawLocalResolvers) {
    return Object.entries(rawLocalResolvers).reduce((result, entry) => {
        const resolverName = entry[0];
        const resolverFunction = entry[1];
        return {
            ...result,
            [resolverName]: (variables) => {
                const resolverResult = resolverFunction(variables, store.getState());

                if (resolverResult && resolverResult.GRAPH_SM_STATE) {
                    store.dispatch({
                        type: 'UPDATE_STATE',
                        state: resolverResult
                    });

                    return resolverResult;
                }

                return resolverResult;
            }
        };
    }, {});
}

function prepareStore(initialLocalState, reduxMiddlewares) {
    return createStore((state = initialLocalState, action) => {
        switch (action.type) {
            case 'UPDATE_STATE': {
                return action.state;
            }
            default: {
                return state;
            }
        }
    }, applyMiddleware(...reduxMiddlewares));
}

function removeRemoteQueries(ast, localResolvers) {
    return removeRemoteOrLocalQueries(ast, localResolvers, (selection) => {
        return localResolvers[selection.name.value];
    });
}

function removeLocalQueries(ast, localResolvers) {
    return removeRemoteOrLocalQueries(ast, localResolvers, (selection) => {
        return !localResolvers[selection.name.value];
    });
}

function removeRemoteOrLocalQueries(ast, localResolvers, filter) {
    const newAST = removeUnusedVariableDefinitions({
        ...ast,
        definitions: ast.definitions.map((definition) => {
            return {
                ...definition,
                selectionSet: {
                    ...definition.selectionSet,
                    selections: definition.selectionSet.selections.filter(filter)
                }
            };
        })
    });

    if (newAST.definitions[0].selectionSet.selections.length === 0) {
        return null;
    }
    else {
        return newAST;
    }
}

function removeUnusedVariableDefinitions(ast) {
    return {
        ...ast,
        definitions: ast.definitions.map((definition) => {
            const variableNamesInSelections = definition.selectionSet.selections.reduce((result, selection) => {
                const variableNamesInSelection = selection.arguments.reduce((result, argument) => {
                    return [...result, argument.name.value];
                }, []);
                return [...result, ...variableNamesInSelection];
            }, []);
            return {
                ...definition,
                variableDefinitions: definition.variableDefinitions.filter((variableDefinition) => {
                    return variableNamesInSelections.includes(variableDefinition.variable.name.value);
                })
            };
        })
    };
}

async function executeRemoteQuery(endpoint, remoteQueryString, remoteVariables, userToken) {
    const response = await window.fetch(endpoint, {
        method: 'post',
        headers: {
            'content-type': 'application/json',
            ...userToken && {
                'Authorization': `Bearer ${userToken}`
            } //TODO As far as I understand the syntax above will be standard and this TypeScript error might go away with the following: https://github.com/Microsoft/TypeScript/issues/10727
        },
        body: JSON.stringify({
            query: remoteQueryString,
            variables: remoteVariables
        })
    });

    const responseJSON = await response.json();

    return responseJSON;
}
