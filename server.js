const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public'))); // for HTML/JS/CSS

// In-memory ticket store
const tickets = [];

// Helper to find ticket by roomId
function findTicket(roomId) {
  return tickets.find(t => t.roomId === roomId);
}

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // User creates a ticket
  socket.on('create-ticket', ({ title }) => {
    const roomId = 'ticket_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const ticket = { roomId, title, unread: true };
    tickets.push(ticket);
    socket.emit('ticket-created', { roomId, title });
    io.emit('new-ticket', ticket); // Notify staff
  });

  // Staff requests all tickets
  socket.on('get-tickets', () => {
    socket.emit('tickets-list', tickets);
  });

  // Mark ticket as read (staff views it)
  socket.on('mark-read', (roomId) => {
    const ticket = findTicket(roomId);
    if (ticket) ticket.unread = false;
    io.emit('tickets-list', tickets); // Update all staff
  });

  // Join a chat room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room ${roomId}`);
  });

  // Send message in a room
  socket.on('send-message', ({ roomId, text, sender }) => {
    const ticket = findTicket(roomId);
    if (ticket && sender === 'user') {
      ticket.unread = true; // Mark as unread for staff
      io.emit('tickets-list', tickets); // Update staff badges
    }
    io.to(roomId).emit('receive-message', { text, sender, time: new Date().toISOString() });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
