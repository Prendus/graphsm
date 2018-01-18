import {
    GraphSMInit,
    execute
} from '../graphsm';

GraphSMInit({
    initialLocalState: {
        components: {}
    },
    localSchema: `
        scalar Any

        type State {
            components: [ComponentState!]!
        }

        interface ComponentState {
            componentId: String!
        }

        type ComponentState1 implements ComponentState {
            componentId: String!
            hello: Int!
        }

        type ComponentState2 implements ComponentState {
            componentId: String!
            there: Int!
        }

        type Query {
            componentState(componentId: String!): ComponentState1!
        }

        type Mutation {
            updateComponentState(componentId: String!, key: String!, value: Any!): Boolean!
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
            updateComponentState(componentId: "component1", key: "hello", value: "Monkey")
        }
    `);

    const result = await execute(`
        query {
            componentState(componentId: "component1") {
                ... on ComponentState1 {
                    hello
                }
            }
        }
    `);

    console.log(result);
})();
