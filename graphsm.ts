import {
    parse,
    graphql,
    buildSchema,
    GraphQLScalarType
} from './graphql/module/index';

import createStore from './redux/es/createStore';
import applyMiddleware from './redux/es/applyMiddleware';

let initialLocalState = {};
let endpoint = null;
let localSchema = null;
let localResolvers = null;
let store = null;
let reduxMiddlewares = [];

export const Any = new GraphQLScalarType({
    name: 'Any',
    serialize: (value) => value
});

export function GraphSMInit(options) {
    initialLocalState = Object.keys(options).includes('initialLocalState') ? options.initialLocalState : initialLocalState;
    endpoint = Object.keys(options).includes('endpoint') ? options.endpoint : endpoint;
    localSchema = Object.keys(options).includes('localSchema') ? buildSchema(options.localSchema) : buildSchema(localSchema); //TODO we might want to throw an error here to make it easy for the user
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

function prepareLocalResolvers(rawLocalResolvers) {
    return Object.entries(rawLocalResolvers).reduce((result, entry) => {
        const resolverName = entry[0];
        const resolverFunction = entry[1];
        return {
            ...result,
            [resolverName]: (variables) => {
                const resolverResult = resolverFunction(variables, store.getState());

                if (Object.keys(resolverResult || {}).length === 2 && resolverResult.state) {
                    store.dispatch({
                        type: 'UPDATE_STATE',
                        state: resolverResult.state
                    });

                    return resolverResult.value;
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
