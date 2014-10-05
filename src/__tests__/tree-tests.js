// MODULES
jest.dontMock('../lib');
jest.dontMock('../util');

// TEST DATA
var data = {
    user: {
        name: "foo",
        emailValidated: false,
        authorizationLevel: 3,
    },
    create: {
        bgImage: {
            base64url: null,
            position: { x: 100.34, y: 32.32 },
            base64export: null,
        },
        stations: [
            {
                title: "bar",
            },
        ],
    },
    server: {
        isWaitingForServer: false,
        lastServerAction: "USER_LOGIN_SUCCESS",
    },
};


describe('tree', function() {
    var Tree = require('../lib');
    it('sets simple value', function(done) {
        var tree = new Tree(data),
            newName = "ohnoes";
        tree.addUpdateListener(function() {
            expect(tree.root.value.user.name).toBe(newName);
            expect(tree.root.user.value.name).toBe(newName);
            expect(tree.root.user.name.value).toBe(newName);
            done();
        });
        tree.root.user.name.set(newName);
    });
    it('sets complex object', function(done) {
        var tree = new Tree(data),
            newName = "what";
        tree.addUpdateListener(function() {
            expect(tree.root.value.user.name).toBe(newName);
            expect(tree.root.user.value.name).toBe(newName);
            expect(tree.root.user.name.value).toBe(newName);
            done();
        });
        tree.root.user.set({ name: newName });
    });
    it('verifies cloning', function(done) {
        var tree = new Tree(data),
            oldRoot = tree.root,
            oldUser = oldRoot.user,
            oldName = oldUser.name,
            oldEmail = oldUser.emailValidated,
            oldServer = oldRoot.server;
        tree.addUpdateListener(function() {
            expect(tree.root).not.toBe(oldRoot);
            expect(tree.root.user).not.toBe(oldUser);
            expect(tree.root.user.name).not.toBe(oldName);
            expect(tree.root.user.emailValidated).toBe(oldEmail);
            expect(tree.root.server).toBe(oldServer);
            done();
        });
        tree.root.user.name.set("something");
    });
    it('updates object', function(done) {
        var tree = new Tree(data),
            newName = tree.root.user.name.value + "bar";
        tree.addUpdateListener(function() {
            expect(tree.root.value.user.name).toBe(newName);
            expect(tree.root.user.value.name).toBe(newName);
            expect(tree.root.user.name.value).toBe(newName);
            done();
        });
        tree.root.user.name.update(function(value) {
            return value+"bar";
        });
    });
    it('updates after tick', function(done) {
        var tree = new Tree(data),
            newName = "hello";
        tree.addUpdateListener(function() {
            expect(tree.root.user.name.value).toBe(newName);
            expect(tree.root.user.emailValidated.value).toBe(true);
            done();
        });
        tree.root.user.name.set(newName);
        tree.root.user.emailValidated.set(true);
    });
    it('pushes value to array', function(done) {
        var tree = new Tree(data),
            oldLength = tree.root.create.stations.value.length;
        tree.addUpdateListener(function() {
            expect(tree.root.create.stations.value.length).toBe(oldLength+1);
            expect(tree.root.value.create.stations.length).toBe(oldLength+1);
            expect(tree.root.create.stations[1]).not.toBe(undefined);
            done();
        });
        tree.root.create.stations.push({ something: true });
    });
});
