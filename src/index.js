const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const messages = require('./utils/messages');
const { addUsers, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = new express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, '../public');

app.use(express.static(publicDirectory));

let count = 0;
io.on('connection', (socket) => {
    console.log('New WebSocket connection');

    socket.on('join', (options, callback) => {
        const { error, user } = addUsers({
            id: socket.id,
            ...options
        });
        
        if(error) {
            return callback(error);
        }
        socket.join(user.room);

        socket.emit('message', generateMessage('Admin', 'Welcome to the Chat room'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
        
        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        if(user) {
            const filter = new Filter();
            if(filter.isProfane(message))
                callback('Profinity is not allowed');
            
            io.to(user.room).emit('message', generateMessage(user.username, message));
            callback('Delivered!');
        }
        
    });

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id);

        if(user) {
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`));
            callback();
        }
        
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});


server.listen(port, () => {
    console.log(`Server up and running at port ${port}`);
});