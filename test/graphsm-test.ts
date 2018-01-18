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
            query(
                $componentId1: String!
                $componentId2: String!
                $componentId3: String!
                $componentId4: String!
                $componentId5: String!
            ) {
                one: componentState(componentId: $componentId1)
                two: componentState(componentId: $componentId2)
                three: componentState(componentId: $componentId3)
                four: componentState(componentId: $componentId4)
                five: componentState(componentId: $componentId5)
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
