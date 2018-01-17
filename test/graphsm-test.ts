import {
    GraphSMInit,
    execute
} from '../graphsm';

GraphSMInit({
    localSchema: `
        type Query {
            hello: String!
        }

        type Mutation {
            updateHello(hello: String!): String!
        }
    `,
    localResolvers: {
        hello: (variables, state) => {
            return state.hello;
        },
        updateHello: (variables, state) => {
            return {
                value: variables.hello,
                state: {
                    ...state,
                    hello: variables.hello
                }
            };
        }
    }
});

(async () => {
    await execute(`
        mutation {
            updateHello(hello: "My name is John")
        }
    `);

    const result = await execute(`
        query {
            hello
        }
    `);

    console.log(result);
})();
