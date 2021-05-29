import express, {Application} from "express";
import * as socketio from "socket.io";
import {createServer, Server as HTTPServer} from "http";
import path from "path";
export class Server {
    private httpServer:HTTPServer;
    private app: Application;
    private io;
    private activeSockets = [];
    private readonly DEFAULT_PORT = process.env.PORT || 6400;

    constructor(){
        this.initialize();
    }

    private initialize(): void{
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = require("socket.io")(this.httpServer);
        this.configureApp();
        this.handleRoutes();

        this.handleSocketConnection();
    }

    private handleRoutes():void{
        this.app.get("/", (req,res)=>{
            res.sendFile('index.html');
        });
    }
    private handleSocketConnection():void{
        console.log("Socket connection called");
        this.io.on("connection", socket =>{
            console.log("Socket connected");
            socket.on("user-info",data=>{

                var username =  data.username;
                const existingSocket = this.activeSockets.find(
                    existingSocket => existingSocket ==socket.id
                );
                if(!existingSocket){
                    this.activeSockets.push({username:username,socket_id:socket.id});
    
                    socket.emit("update-user-list", {
                        users: this.activeSockets.filter(activeSocket => activeSocket.socket_id != socket.id)
                    });
                    socket.broadcast.emit("update-user-list",{
                        users:[{username:username,socket_id:socket.id}]
                    });
                    console.log(socket.id);
                    socket.emit("user", {name:username,socket_id:socket.id});
                }
            });
            

            socket.on("disconnect",()=>{
                this.activeSockets = this.activeSockets.filter(activeSocket => activeSocket.socket_id !=socket.id);
                socket.broadcast.emit("remove-user",{
                    socketId: socket.id
                });
            });

            socket.on("disconnect-call",data=>{
                socket.to(data.to).emit("disconnect-ask",{
                    to:data.to,
                    from:socket.id
                });
            });
            socket.on("call-user",data =>{
                socket.to(data.to).emit("call-made",{
                    offer:data.offer,
                    socket:socket.id
                });
            });

            socket.on("make-answer",data =>{
                socket.to(data.to).emit("answer-made",{
                    answer:data.answer,
                    socket:socket.id
                });
            });
        });
    }

    public listen(callback: (port)=> void): void{
        this.httpServer.listen(this.DEFAULT_PORT, ()=>{
            callback(this.DEFAULT_PORT);
        })
    }
    public configureApp():void{
        this.app.use(express.static(path.join(__dirname,"../src/public")));
    }
}