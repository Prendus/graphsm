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

const cloudFunctionsRootToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1MDgyNTUyOTAsImNsaWVudElkIjoiY2oyd2lmdnZmM29raTAxNTRtZnN0c2lscCIsInByb2plY3RJZCI6ImNqOGRsenhnbjBveXIwMTQ0NTc0dTJpdmIiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqOHZzOWFuMjA1ZDgwMTI0dTE5eXJxamEifQ.X7W_f3RjpNr032pFpn0lG6eCAiUzC1kmizA-YBR6Uss';

GraphSMInit({
    initialLocalState: {
        components: {}
    },
    localSchema: `
        scalar Any

        interface ComponentState {
            componentId: String!
        }

        type Question {
            text: String!
            code: String!
        }

        type ComponentState1 implements ComponentState {
            componentId: String!
            question: Question!
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
            updateComponentState(componentId: String!, props: Any): Any
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
                        ...variables.props
                    }
                }
            };
        }
    },
    reduxMiddlewares: [reduxLogger],
    remoteEndpoint: 'https://api.graph.cool/simple/v1/cj8dlzxgn0oyr0144574u2ivb'
});

(async () => {
    addIsTypeOf('ComponentState', 'ComponentState1', (value) => {
        return value.question;
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

    const result = await execute(`
        mutation prepare(
            $componentId: String!
            $props: Any
        ) {
            updateComponentState(componentId: $componentId, props: $props)
        }

        query retrieve($componentId: String!) {
            componentState(componentId: $componentId) {
                ... on ComponentState1 {
                    question {
                        text
                        code
                    }
                }
            }
            allUsers {
                id
            }
        }

        mutation finish(
            $componentId: String!
            $props: Any
        ) {
            updateComponentState(componentId: $componentId, props: $props)
        }
    `, {
        prepare: (previousResult) => {
            console.log('prepare previousResult', previousResult);
            return {
                componentId: 'component1',
                props: {
                    loaded: false,
                    question: {
                        text: 'This is the text',
                        code: 'This is the code'
                    }
                }
            };
        },
        retrieve: (previousResult) => {
            console.log('retrieve previousResult', previousResult);
            return {
                componentId: 'component1'
            };
        },
        finish: (previousResult) => {
            console.log('finish previousResult', previousResult);
            const question = previousResult.data.componentState.question;
            return {
                componentId: 'component1',
                props: {
                    question,
                    builtQuestion: {
                        ...question,
                        text: question.text + ' built',
                        code: question.code + ' built'
                    }
                }
            };
        }
    }, cloudFunctionsRootToken);

    console.log(result);

    // subscribe(async () => {
    //     const result = await execute(`
    //         query(
    //             $componentId1: String!
    //             $componentId2: String!
    //             $componentId3: String!
    //             $componentId4: String!
    //             $componentId5: String!
    //         ) {
    //             one: componentState(componentId: $componentId1) {
    //                 ... on ComponentState1 {
    //                     one
    //                 }
    //             }
    //             two: componentState(componentId: $componentId2) {
    //                 ... on ComponentState2 {
    //                     two
    //                 }
    //             }
    //             three: componentState(componentId: $componentId3) {
    //                 ... on ComponentState3 {
    //                     three
    //                 }
    //             }
    //             four: componentState(componentId: $componentId4) {
    //                 ... on ComponentState4 {
    //                     four
    //                 }
    //             }
    //             five: componentState(componentId: $componentId5) {
    //                 ... on ComponentState5 {
    //                     five
    //                 }
    //             }
    //         }
    //     `, {
    //         componentId1: "component1",
    //         componentId2: "component2",
    //         componentId3: "component3",
    //         componentId4: "component4",
    //         componentId5: "component5"
    //     });
    //
    //     console.log(result);
    // });
    //
    // await execute(`
    //     mutation(
    //         $componentId1: String!
    //         $componentId2: String!
    //         $componentId3: String!
    //         $componentId4: String!
    //         $componentId5: String!
    //         $key1: String!
    //         $key2: String!
    //         $key3: String!
    //         $key4: String!
    //         $key5: String!
    //         $value1: Any
    //         $value2: Any
    //         $value3: Any
    //         $value4: Any
    //         $value5: Any
    //     ) {
    //         one: updateComponentState(componentId: $componentId1, key: $key1, value: $value1)
    //         two: updateComponentState(componentId: $componentId2, key: $key2, value: $value2)
    //         three: updateComponentState(componentId: $componentId3, key: $key3, value: $value3)
    //         four: updateComponentState(componentId: $componentId4, key: $key4, value: $value4)
    //         five: updateComponentState(componentId: $componentId5, key: $key5, value: $value5)
    //     }
    // `, {
    //     componentId1: "component1",
    //     componentId2: "component2",
    //     componentId3: "component3",
    //     componentId4: "component4",
    //     componentId5: "component5",
    //     key1: "one",
    //     key2: "two",
    //     key3: "three",
    //     key4: "four",
    //     key5: "five",
    //     value1: "Monkey",
    //     value2: "Chunkey",
    //     value3: "Blunkey",
    //     value4: "Flunkey",
    //     value5: "Zunkey"
    // });
})();
