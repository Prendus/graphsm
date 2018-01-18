import {
    GraphSMInit,
    execute,
    Any,
    subscribe
} from '../graphsm';

const reduxLogger = (store) => (next) => (action) => {
    console.log('dispatching', action);
    const result = next(action);
    console.log('state', store.getState());
    return result;
};

GraphSMInit({
    initialLocalState: {
        components: {}
    },
    localSchema: `
        scalar Any

        type Query {
            componentState(componentId: String!): Any
        }

        type Mutation {
            updateComponentState(componentId: String!, key: String!, value: Any): Boolean!
        }
    `,
    localResolvers: {
        Any: Any, //TODO the reason I'm not shortening this with ES6 is most likely because of a bug in my SystemJS while emulating ES modules
        componentState: (variables, state) => {
            return state.components[variables.componentId];
        },
        updateComponentState: (variables, state) => {
            return {
                value: true,
                state: {
                    ...state,
                    components: {
                        ...state.components,
                        [variables.componentId]: {
                            ...state.components[variables.componentId],
                            [variables.key]: variables.value
                        }
                    }
                }
            };
        }
    },
    reduxMiddlewares: []
});

(async () => {
    subscribe(async () => {
        const result = await execute(`
            query {
                one: componentState(componentId: "component1")
                two: componentState(componentId: "component2")
                three: componentState(componentId: "component3")
                four: componentState(componentId: "component4")
                five: componentState(componentId: "component5")
            }
        `);

        console.log(result);
    });

    await execute(`
        mutation {
            one: updateComponentState(componentId: "component1", key: "one", value: "Monkey")
            two: updateComponentState(componentId: "component2", key: "two", value: "Monkey")
            three: updateComponentState(componentId: "component3", key: "three", value: "Monkey")
            four: updateComponentState(componentId: "component4", key: "four", value: "Monkey")
            five: updateComponentState(componentId: "component5", key: "five", value: "Monkey")
        }
    `);
})();
