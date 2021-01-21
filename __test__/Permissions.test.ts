/**
 * Created by macdja38 on 2017-07-08.
 */

const exampleConfiguration = {

  "*": {
    "*": {
      "music": {
        "*": true
      }
    },
    "u85257659694993408": {
      "*": true
    }
  },
  "200168933498683393": {
    "*": {
      "music": {
        "*": 10
      }
    }
  },
  "200531249167728641": {
    "*": {
      "music": {
        "*": false
      }
    }
  },
  "id": "200168933498683392"
};


import Permissions, { testExports } from "../src/lib/Permissions";

test("tests node building code with NaN", () => {
  expect(testExports._buildNode(["foo", "bar"], NaN)).toMatchObject({foo: {bar: NaN}});
});

test("tests node building code with null", () => {
  expect(testExports._buildNode(["foo", "bar"], false)).toMatchObject({foo: {bar: false}});
});

test("tests node building code with 0 entry arguments", () => {
  expect(testExports._buildNode([], true)).toBe(true);
});

test("Test getOrderedGroups with complicated data set", () => {
  // @ts-ignore
  expect(testExports._getOrderedGroups([
      {id: '333142777921667073', position: 3},
      {id: '333142780471934986', position: 1},
      {id: '333142782350852097', position: 1},
      {id: '333142783839961088', position: 1}
    ], ['333142783839961088', '333142782350852097', '333142777921667073'],
    "usersId")
  ).toMatchObject(['uusersId',
    'g333142777921667073',
    'g333142782350852097',
    'g333142783839961088']);
});

test("Test permissions check", () => {
  expect(testExports._searchForNode(exampleConfiguration, ["*", "*", "music", "*"])).toBe(true);
});

test("Test permissions skipping numbers", () => {
  expect(testExports._searchForNode(exampleConfiguration, ["200168933498683393", "*", "music", "*"])).toBe(true);
});

test("Test Permissions Recursive addition of node", () => {
  expect(testExports._recursiveAdd(exampleConfiguration, ["*", "*", "music", "initInto"], true)).toMatchObject({
    "*": {
      "*": {
        "music": {
          "*": true,
          "initInto": true
        }
      }
    }
  });
});
