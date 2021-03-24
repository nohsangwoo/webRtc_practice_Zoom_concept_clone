const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
//socket.io config
// 이 노드서버를 socket.io화 시키고
const io = require('socket.io')(server, {
  // cors설정도 해줌
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

//사용자가 localhost:3000접속시 FE단으로 날리는 함수
io.on('connection', socket => {
  //사용자가 localhost:3000으로 접속하면 socket.io 고유 아이디를 "me"트리거를 이용하여 FE쪽으로 보냄
  socket.emit('me', socket.id);

  socket.on('disconnect', () => {
    socket.broadcast.emit('callEnded');
  });

  //   FE단에서 먼저 "callUser" 트리거로 신호를 보내줘야 작동함
  //  FE단에서 보낸 변수와 함께 작동
  socket.on('callUser', data => {
    //   아마도 FE단에서 데이터를 받으면 데이터를 가공하여 다시 FE로 보내는 함수인듯
    io.to(data.userToCall).emit('callUser', {
      signal: data.signalData,
      from: data.from,
      name: data.name,
    });
  });

  socket.on('answerCall', data => {
    io.to(data.to).emit('callAccepted', data.signal);
  });
});

server.listen(5000, () => console.log('server is running on port 5000'));
