import {
    GraphSMInit,
    execute
} from '../graphsm';

GraphSMInit({
    initialLocalState: {
        components: {}
    },
    localSchema: `
        type State {
            hello: Int!
        }

        type Query {
            componentState(componentId: String!): State!
        }

        type Mutation {
            updateComponentState(componentId: String!, key: String!, value: Int!): Boolean!
        }
    `,
    localResolvers: {
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
    }
});

(async () => {
    await execute(`
        mutation {
            one: updateComponentState(componentId: "component1", key: "hello", value: 10)
            two: updateComponentState(componentId: "component1", key: "hello", value: 20)
        }
    `);

    const result = await execute(`
        query {
            one: componentState(componentId: "component1") {
                hello
            }
            two: componentState(componentId: "component1") {
                hello
            }
        }
    `);

    console.log(result);
})();
