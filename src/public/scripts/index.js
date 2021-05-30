const {RTCPeerConnection, RTCSessionDescription} = window;
let isAlreadycalling = false;
var activeUser = null;
var users = {}; 
var is_joined = false;
var configuration = null

window.onload = function() {
    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function($evt){
       if(xhr.readyState == 4 && xhr.status == 200){
           let res = JSON.parse(xhr.responseText);
           console.log("response: ",res["v"]["iceServers"]);
           configuration = {'iceServers':[res["v"]["iceServers"]]};
        //    {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]}
       }
    }
    xhr.open("PUT", "https://global.xirsys.net/_turn/VoiceCord", true);
    xhr.setRequestHeader ("Authorization", "Basic " + btoa("umeshmeena141:1b2eb1a0-c124-11eb-9467-0242ac150003") );
    xhr.setRequestHeader ("Content-Type", "application/json");
    xhr.send( JSON.stringify({"format": "urls"}) );
};
async function setLocalTracks(socket_id){
    const stream  = await navigator.mediaDevices.getUserMedia(
        {
            video:true, audio:true
        }
    );
    const localVideo = document.getElementById("local-video");
    if (localVideo) {
        localVideo.srcObject = stream;
    }
    stream.getTracks().forEach(track => users[socket_id].addTrack(track,stream));
}

// peerConnection.ontrack = function({ streams: [stream] }) {
//     const remoteVideo = document.getElementById("remote-video");
//     // if (peerConnection.)
//     console.log("Remote Video", stream)
//     if (remoteVideo) {
//       remoteVideo.srcObject = stream;
//     }
//   };
// updateUserList = []
function setRemoteTrack(socket_id){

    const remoteVideo = document.getElementById("remote_"+socket_id);
    // if (peerConnection.)
    if (remoteVideo) {
        // console.log("Remote Video",peerConnection.getRemoteStreams()[0])
        remoteVideo.srcObject = users[socket_id].getRemoteStreams()[0];
    }
}

const socket = io();
function connect(){
    username = document.getElementById("user").value;
    is_joined = true;
    console.log("clicked");
    if(!username){
        window.alert("Please enter Username");
    }
    else{
        socket.emit("user-info",{
            username:username
        });
        document.getElementsByClassName("content-container")[0].style.display = "block";
        document.getElementsByClassName("join-container")[0].style.display = "none";
    }
    

}
socket.on("update-user-list", ({users,call})=>{
    // console.log(data,"USers");
    if(is_joined){
        updateUserList(users,call);
    }
});

function unselectUsersFromList(){
    console.log("Unselect")
    const users = document.querySelectorAll('.active-user.active-user--selected')
    isAlreadycalling = false;
    if(users.length > 0){
        users.forEach(user=>{
            user.setAttribute("class","active-user");
        });
    }
    
}

async function callWithUser(socketId){

    const offer = await users[socketId].createOffer();
    
    console.log("calling",offer);
    await users[socketId].setLocalDescription(new RTCSessionDescription(offer)).then(()=>{
        socket.emit("call-user",{
            offer,
            to:socketId
        });
    });
    
}
function createRemoteVideoElement(socket_id,name){
    console.log("v");
    const remoteContainer = document.createElement('video');
    // remoteContainer.setAttribute("class","remote-video");
    remoteContainer.setAttribute("id","remote_"+ socket_id);
    remoteContainer.setAttribute("autoplay","");
    remoteContainer.setAttribute("class","col")
    // remoteContainer.setAttribute("style","background-color:black");
    const videoContainer = document.getElementsByClassName('video-container')[0];
    const buttonDiv = document.createElement('div');
    buttonDiv.setAttribute("class","col");
    const btn = document.createElement("button")
    btn.setAttribute("class","btn-danger col");
    btn.innerHTML = "Mute";
    buttonDiv.appendChild(btn);
    const remoteVideoContainer = document.createElement('div');
    remoteVideoContainer.setAttribute("class","col remote-video p-0");
    remoteVideoContainer.setAttribute("id",socket_id);

    const nameContainer = document.createElement('div');
    nameContainer.setAttribute("class","col local_user overlay")
    nameContainer.innerHTML = `<div class="col text-center align_vertical">${name}</div>`;
    remoteVideoContainer.appendChild(nameContainer);

    remoteVideoContainer.appendChild(remoteContainer);
    remoteVideoContainer.appendChild(buttonDiv);

    
    videoContainer.appendChild(remoteVideoContainer);
    console.log("dada");
}

function createUserItemContainer(socketId, call){

    users[socketId.socket_id] = new RTCPeerConnection(configuration);
    createRemoteVideoElement(socketId.socket_id, socketId.username);
    console.log(call);
    setLocalTracks(socketId.socket_id).then(
        ()=>{
            console.log(call);
            if(call){
                callWithUser(socketId.socket_id);
            }
        }
    );
}
function updateUserList(socketIds, call){
    // const activeUserContainer = document.getElementById("active-user-container");
    console.log(call,"1");
    socketIds.forEach(socketId => {
        const alreadyExistingUser = document.getElementById('remote_'+socketId.socket_id);
        console.log(call,"2", alreadyExistingUser);
        if(!alreadyExistingUser){
            createUserItemContainer(socketId, call);
            // activeUserContainer.appendChild(userContainer);
        }
    });
}

function disconnectCall(socketId){
    console.log("DISCONNECT");
    users[socketId].close();
    users[socketId] = null
    users[socketId] = new RTCPeerConnection();
    setLocalTracks(socketId);
    activeUser = null;
    unselectUsersFromList();
}
socket.on("disconnect-ask", data=>{
    
    disconnectCall(data.from);
    // const remoteVideo = document.getElementById("remote-video");
    // if(remoteVideo){
    //     remoteVideo.srcObject = null;
    // }
});

socket.on("remove-user",({socketId})=>{
    removeUser(socketId);
    isAlreadycalling = false;
});

function removeUser(socketId){
    const userContainer = document.getElementById(socketId);
    // const remoteContainer = document.getElementById("remote_"+ socketId);
    delete users[socketId];
    if (userContainer){
        userContainer.remove();
        // remoteContainer.remove();
    }
}

socket.on("user",({name})=>{
    console.log("name",name);
    const current_user = document.getElementById("current_user");
    const local_user = document.getElementById("local_user");
    current_user.innerHTML = name;
    local_user.innerHTML = `<div class="col text-center align_vertical">${name}</div>`;
});

socket.on("call-made", async data=>{
    await users[data.socket].setRemoteDescription(new RTCSessionDescription(data.offer)).then(async()=>{

        await users[data.socket].createAnswer().then(async(answer)=>{
            await users[data.socket].setLocalDescription(new RTCSessionDescription(answer)).then(async()=>{
                // console.log("Before Answer",peerConnection.getLocalStreams());
                socket.emit("make-answer",{
                    answer:answer,
                    to:data.socket
                });
                // console.log("After Answer",peerConnection.getLocalStreams());
                isAlreadycalling = true;
                activeUser = data.socket;
                const userContainer = document.getElementById(data.socket);
                // userContainer.setAttribute("class","active-user active-user--selected");
                setRemoteTrack(data.socket);
            });
        }); 
    });
});

socket.on('answer-made', async data=>{
    console.log("Answer Recieved", data);
    console.log("Remote Des1",users);
    await users[data.socket].setRemoteDescription(new RTCSessionDescription(data.answer)).then(()=>{
        console.log("Remote Des");
        activeUser = data.socket;
        setRemoteTrack(data.socket);
        if(!isAlreadycalling){
            callWithUser(data.socket);
            if(users[data.socket].getRemoteStreams().length > 0){
                isAlreadycalling = true;
            }        
            // peerConnection = new RTCPeerConnection();
        }
    });
});
