import {
    GraphSMInit,
    execute,
    Any,
    subscribe,
    addIsTypeOf
} from '../graphsm';

import {GraphQLObjectType} from '../graphql/module/index';

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

        interface ComponentState {
            componentId: String!
        }

        type ComponentState1 implements ComponentState {
            componentId: String!
            one: String!
        }

        type ComponentState2 implements ComponentState {
            componentId: String!
            two: String!
        }

        type ComponentState3 implements ComponentState {
            componentId: String!
            three: String!
        }

        type ComponentState4 implements ComponentState {
            componentId: String!
            four: String!
        }

        type ComponentState5 implements ComponentState {
            componentId: String!
            five: String!
        }

        type Query {
            componentState(componentId: String!): ComponentState
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
                ...state,
                components: {
                    ...state.components,
                    [variables.componentId]: {
                        ...state.components[variables.componentId],
                        [variables.key]: variables.value
                    }
                }
            };
        }
    },
    reduxMiddlewares: [reduxLogger]
});

(async () => {
    addIsTypeOf('ComponentState', 'ComponentState1', (value) => {
        return value.one;
    });

    addIsTypeOf('ComponentState', 'ComponentState2', (value) => {
        return value.two;
    });

    addIsTypeOf('ComponentState', 'ComponentState3', (value) => {
        return value.three;
    });

    addIsTypeOf('ComponentState', 'ComponentState4', (value) => {
        return value.four;
    });

    addIsTypeOf('ComponentState', 'ComponentState5', (value) => {
        return value.five;
    });

    subscribe(async () => {
        const result = await execute(`
            query(
                $componentId1: String!
                $componentId2: String!
                $componentId3: String!
                $componentId4: String!
                $componentId5: String!
            ) {
                one: componentState(componentId: $componentId1) {
                    ... on ComponentState1 {
                        one
                    }
                }
                two: componentState(componentId: $componentId2) {
                    ... on ComponentState2 {
                        two
                    }
                }
                three: componentState(componentId: $componentId3) {
                    ... on ComponentState3 {
                        three
                    }
                }
                four: componentState(componentId: $componentId4) {
                    ... on ComponentState4 {
                        four
                    }
                }
                five: componentState(componentId: $componentId5) {
                    ... on ComponentState5 {
                        five
                    }
                }
            }
        `, {
            componentId1: "component1",
            componentId2: "component2",
            componentId3: "component3",
            componentId4: "component4",
            componentId5: "component5"
        });

        console.log(result);
    });

    await execute(`
        mutation(
            $componentId1: String!
            $componentId2: String!
            $componentId3: String!
            $componentId4: String!
            $componentId5: String!
            $key1: String!
            $key2: String!
            $key3: String!
            $key4: String!
            $key5: String!
            $value1: Any
            $value2: Any
            $value3: Any
            $value4: Any
            $value5: Any
        ) {
            one: updateComponentState(componentId: $componentId1, key: $key1, value: $value1)
            two: updateComponentState(componentId: $componentId2, key: $key2, value: $value2)
            three: updateComponentState(componentId: $componentId3, key: $key3, value: $value3)
            four: updateComponentState(componentId: $componentId4, key: $key4, value: $value4)
            five: updateComponentState(componentId: $componentId5, key: $key5, value: $value5)
        }
    `, {
        componentId1: "component1",
        componentId2: "component2",
        componentId3: "component3",
        componentId4: "component4",
        componentId5: "component5",
        key1: "one",
        key2: "two",
        key3: "three",
        key4: "four",
        key5: "five",
        value1: "Monkey",
        value2: "Chunkey",
        value3: "Blunkey",
        value4: "Flunkey",
        value5: "Zunkey"
    });
})();
