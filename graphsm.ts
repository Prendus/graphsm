import {
    parse,
    graphql,
    buildSchema,
    GraphQLScalarType,
    GraphQLObjectType
} from './graphql/module/index';

import createStore from './redux/es/createStore';
import applyMiddleware from './redux/es/applyMiddleware';

let initialLocalState = {
    GRAPH_SM_STATE: true
};
let endpoint = null;
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
    endpoint = Object.keys(options).includes('endpoint') ? options.endpoint : endpoint;
    localSchemaString = Object.keys(options).includes('localSchema') ? options.localSchema : localSchemaString; //TODO we might want to throw an error here to make it easy for the user
    localSchema = buildSchema(localSchemaString);
    localResolvers = Object.keys(options).includes('localResolvers') ? prepareLocalResolvers(options.localResolvers) : localResolvers;
    reduxMiddlewares = Object.keys(options).includes('reduxMiddlewares') ? options.reduxMiddlewares : reduxMiddlewares;
    store = prepareStore(initialLocalState, reduxMiddlewares);
}

export async function execute(queryString, variables) {
    return await graphql(localSchema, queryString, localResolvers, null, variables);
}

export function subscribe(callback) {
    return store.subscribe(callback);
}

export function addIsTypeOf(abstractName, concreteName, isTypeOf) {
    //TODO this is really bad to do, depending on a private API, but I don't see any official way of doing this dynamically
    const concreteTypeObject = localSchema._implementations[abstractName].filter((concreteTypeObject) => {
        return concreteTypeObject.name === concreteName;
    })[0];
    concreteTypeObject.isTypeOf = isTypeOf;
}

export function extendSchema(schemaExtension) {
    localSchemaString = localSchema + schemaExtension;
    localSchema = buildSchema(localSchemaString);
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

                    return true;
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
