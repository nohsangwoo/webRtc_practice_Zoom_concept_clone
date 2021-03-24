import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import AssignmentIcon from '@material-ui/icons/Assignment';
import PhoneIcon from '@material-ui/icons/Phone';
import React, { useEffect, useRef, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
// front-end단 peer
import Peer from 'simple-peer';
// front-end단 socket.io
import io from 'socket.io-client';
import './App.css';

// socket.io가 통신할 백엔드 서버 설정
// https지원하는곳으로 호스팅 해야함
const socket = io.connect('http://localhost:5000');
function App() {
  const [me, setMe] = useState('');
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState('');
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  useEffect(() => {
    //  socket.io api에서 webRtc api를 지원하는듯
    // webRtc API를 이용하여 사용자의 비디오를 불러옴
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(stream => {
        console.log(
          '첫번째 동작 part2// 사용자에게서 자신의 화면을 받아와 화면에 뿌려주는 역할과 상대방에게 영상을 전달하기위한 stream을 데이터화 하여 setStream으로 저장하는 단계'
        );
        setStream(stream);
        myVideo.current.srcObject = stream;
      });

    // 뱍엔드 서버에서 "me"라는 트리거를 이용하여 id라는 변수인자와 함께 front-end쪽으로 보냄
    // "me"트리거에 반응하는 FE쪽 함수
    socket.on('me', id => {
      //BE에서 보낸 socket.id를 프론트단의 setMe useState에 저장
      console.log(
        '첫번째 동작: 사용자 socket.id(고유 아이디)를 setMe(사용자 고유 아이디) 해줌',
        id
      );

      setMe(id);
    });

    socket.on('callUser', data => {
      console.log(
        '상대방이 방을 만들고 callUser트리거를 이용하여 data와 함꼐 신호를 보냄 // 해당 data를 기준으로 각종 useState 값 지정'
      );
      console.log(
        '지정된 useState값으로 실시간 렌더링(answer버튼 과 상대방 이름 표시)'
      );
      setReceivingCall(true);

      //   상대방의 방으로 접속할때 필요한...
      setCaller(data.from);

      //   누가 전화걸었는지 안내표시를 위해
      setName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  // 제일 먼저 callUset를 작동시키는 함수
  //   callUse의 root임
  //  상대방의 아이디로 상대방과 접속함
  const callUser = id => {
    console.log('4번째 동작: 상대방의 아이디를 전달받아 callUser함수 실행 ');

    //peer를 사용하기 위한 상용구인듯
    //stream은 내 화면상황을 실시간으로 상대방에게 전달하기위한 stream
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });
    // 시그널이 발생하는 조건
    // 상대방에게 signal을 이용하여  BE의 callUser를 작동한ㄴ 함수
    peer.on('signal', data => {
      console.log('시그널 발동: callUser를 BE 트리거로 data와 함께 보냄');
      socket.emit('callUser', {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });
    peer.on('stream', stream => {
      console.log('steam 발동: 상대방이 수락하면 발동하는 함수');
      userVideo.current.srcObject = stream;
    });
    socket.on('callAccepted', signal => {
      console.log('callAccepted signal:', signal);
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  //연락이 왔을때 answercall을 누르면 상대방의 아이디로 만든 방으로 내가 접속함
  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    // ㅅ
    peer.on('signal', data => {
      console.log(
        'answer쪽에 시그널이 들어오면  peer signal 동작 // caller(상대방 socket.id)를 백엔드로 보내서 해당 방으로 연결하개끔 만들어줌 '
      );
      socket.emit('answerCall', { signal: data, to: caller });
    });
    peer.on('stream', stream => {
      console.log(
        'answer쪽에 peer stream 이 존재하면 동작 // stream신호가 들어오면 화면에 렌더링 해줌'
      );
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  return (
    <>
      <h1 style={{ textAlign: 'center', color: '#fff' }}>webRtc TestPage</h1>
      <div className="container">
        <div className="video-container">
          {/*  */}
          <div className="video">
            {stream && (
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                style={{ width: '300px' }}
              />
            )}
          </div>
          <div className="video">
            {callAccepted && !callEnded ? (
              <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{ width: '300px' }}
              />
            ) : null}
          </div>
        </div>
        <div className="myId">
          <TextField
            id="filled-basic"
            label="Name"
            variant="filled"
            value={name}
            onChange={e => {
              console.log(
                '두번째 동작: 자신의 이름을 입력하면 setName에 이름을 저장(onChange)',
                name
              );
              return setName(e.target.value);
            }}
            style={{ marginBottom: '20px' }}
          />
          {/* CopyToClipboard 라이브러리를 이용하여 생성된 id를 복사함 */}
          {/* 사용자 고유아이디(socket.io)를 복사해줌 */}
          <CopyToClipboard text={me} style={{ marginBottom: '2rem' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AssignmentIcon fontSize="large" />}
              onClick={() =>
                console.log(
                  '세번째 동작 상대방에게 전달할 내 socket.id를 복사: ',
                  me,
                  ' // 나중에 roomId를 uuid로 만들어서 들어가는 방식으로 대체요망'
                )
              }
            >
              Copy ID
            </Button>
          </CopyToClipboard>

          {/* 접속할 대상의 상대방 고유 아이디(socket.id)를 입력하면 setIdToCall에 저장*/}
          {/*callUser버튼을 누르면 calluser함수가 작동하는데 이때 전달되는 인자가 idToCall */}
          <TextField
            id="filled-basic"
            label="ID to call"
            variant="filled"
            value={idToCall}
            onChange={e => setIdToCall(e.target.value)}
          />
          <div className="call-button">
            {/* callAccepted가 true이고 동시에 callEnded가 false일때만 endCall버튼이 활성화 */}
            {callAccepted && !callEnded ? (
              <Button variant="contained" color="secondary" onClick={leaveCall}>
                End Call
              </Button>
            ) : (
              // 이버튼을 누르면 해당 아이디로 callUser를 작동시킨다
              //callUser버튼을 누르면 calluser함수가 작동하는데 이때 전달되는 인자가 idToCall
              // 방만드는 방식을 상대방이 고유 아이디로 만들지말고 uuid를 이용하여 고유 방을 만든다음
              // 상대방이 고유 방번호로 접속가능하게 구성하는것도 괜찮을듯
              <IconButton
                color="primary"
                aria-label="call"
                onClick={() => callUser(idToCall)}
              >
                <PhoneIcon fontSize="large" />
              </IconButton>
            )}
            {idToCall}
          </div>
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1>{name} is calling...</h1>
              <Button variant="contained" color="primary" onClick={answerCall}>
                Answer
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default App;
