// from https://github.com/CollabVM-Unofficial/GuacUtils/blob/master/GuacUtil.js
function decodeCommand(cypher) {
  var sections = [];
  var bump = 0;
  while (sections.length <= 50 && cypher.length >= bump) {
    var current = cypher.substring(bump);
    var length = parseInt(current.substring(current.search(/\./) - 2));
    var paramater = current.substring(
      length.toString().length + 1,
      Math.floor(length / 10) + 2 + length
    );
    sections[sections.length] = paramater;
    bump += Math.floor(length / 10) + 3 + length;
  }
  sections[sections.length - 1] = sections[sections.length - 1].substring(
    0,
    sections[sections.length - 1].length - 1
  );
  return sections;
}

function encodeCommand(cypher) {
  var command = "";
  for (var i = 0; i < cypher.length; i++) {
    var current = cypher[i];
    command += current.length + "." + current;
    command += i < cypher.length - 1 ? "," : ";";
  }
  return command;
}


const Discord = require('discord.js');
const WebSocket = require('ws')
const client = new Discord.Client();

function decodeCVMChat(msg) {
  return msg.replace(/&lt;/g, "<").replace(/&gt;/, ">").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/#x2F;/g, "/").replace(/<@/g, '<m@').replace(/@here/g, '@ here').replace(/@everyone/g, '@ everyone');
}

function checkIpGrabber(link) { // links taken from grabify custom links
  if (link.includes('lovebird') ||
  link.includes('trulove') ||
  link.includes('datei') ||
  link.includes('otherha') ||
  link.includes('shrekis') ||
  link.includes('headshot') ||
  link.includes('gaming-at') ||
  link.includes('yourmy') ||
  link.includes('imagesha') ||
  link.includes('screensh') ||
  link.includes('gaming') ||
  link.includes('catsnth') ||
  link.includes('curiousc') ||
  link.includes('joinm') ||
  link.includes('fortnit') ||
  link.includes('fortnigh') ||
  link.includes('freegift') ||
  link.includes('stopif') ||
  link.includes('leancodin') ||
  link.includes('grabify')) return true;
  return false;
}

class CVMws {
  constructor(channel, wsAddr, vmName) {
    this.channel = channel;
    this.wsAddr = wsAddr;
    this.vmName = vmName;
    this.msgQueue = [];
    this.queueInterval = setInterval(() => {
      if (this.msgQueue.length == 0) return;
      let [ username, msg ] = this.msgQueue.shift();
      this.chatAs(username, msg);
    }, 1000);
    this.ws = new WebSocket(wsAddr, ['guacamole']);
    this.ws.on('open', () => {
      this.ws.send(encodeCommand(['rename', 'Discord Bridge']));
      this.ws.send(encodeCommand(['connect', vmName]));
      this.channel.send('Connected');
      this.ws.send(encodeCommand(['chat', 'Discord Bridge started']));
    });
    this.ws.on('message', data => {
      let msg = decodeCommand(data);
      if (msg[0] == 'nop') {
        this.ws.send('3.nop;');
      } else if (msg[0] == 'chat') {
        if (this.lastMessage && (this.lastMessage[0] == msg[1] || this.lastMessage[0] == 'Discord Bridge') && this.lastMessage[1] == decodeCVMChat(msg[2])) return;
        if (msg[1].length > 0) this.channel.send(`${msg[1]}: ${decodeCVMChat(msg[2])}`);
        else this.channel.send(`[system message] ${msg[2]}`);
      } else if (msg[0] == 'adduser') {
        // TODO
      }
    });
    this.ws.on('close', (code, reason) => {
      this.channel.send('Connection closed. If you did not unbridge, please run !collabvm unbridge');
    })
  }
  chatAs(username, msg) {
    console.log('rename', username);
    this.ws.send(encodeCommand(['rename', username]));
    setTimeout(() => {
      this.ws.send(encodeCommand(['chat', msg]));
      this.lastMessage = [username, msg];
      setTimeout(() => {
        this.ws.send(encodeCommand(['rename', 'Discord Bridge']));
      }, 300);
    }, 300);
  }
  chatAsEnqueue(username, msg) {
    this.msgQueue.push([username, msg]);
  }
  stop() {
    this.ws.send(encodeCommand(['chat', 'Unbridging']));
    this.ws.send(encodeCommand(['disconnect']));
    this.ws.close();
  }
}

// channelID => CVMws
let bridges = {}

function startBridge(channel, wsAddr, vmName) {
  return new CVMws(channel, wsAddr, vmName);
}

function processCommand(msg) {
  cmd = msg.content.split(' ');
  if (cmd[1] == 'help') {
    msg.channel.send(`Commands: help, bridge, unbridge, status`)
  } else if (cmd[1] == 'bridge') {
    if (cmd.length != 4) {
      msg.channel.send('Invalid syntax. Usage: !collabvm bridge <wsAddr> <vmName>')
      return;
    }
    if (bridges.hasOwnProperty(msg.channel.id)) {
      msg.channel.send(`This channel is already bridged to ${bridges[msg.channel.id].vmName}@${bridges[msg.channel.id].wsAddr}`);
      return;
    }
    if (checkIpGrabber(cmd[2])) {
      msg.channel.send('IP grabber detected! Please Dont Try To Log IPs.');
      return;
    }
    msg.channel.send(`Bridging ${cmd[3]}@${cmd[2]} to this channel`)
    bridges[msg.channel.id] = startBridge(msg.channel, cmd[2], cmd[3]);
  } else if (cmd[1] == 'unbridge') {
    if (bridges[msg.channel.id] == undefined) {
      msg.channel.send('This room is not bridged'); return;
    }
    bridges[msg.channel.id].stop();
    delete bridges[msg.channel.id];
    msg.channel.send('Unbridged');
  } else if (cmd[1] == 'status') {
    if (!bridges.hasOwnProperty(msg.channel.id)) {
      msg.channel.send('[Status] Not bridged'); return;
    }
    msg.channel.send(`[Status] Bridged to ${bridges[msg.channel.id].vmName}@${bridges[msg.channel.id].wsAddr}`);
  }
}

function bridgeToCVM(msg) {
  if (bridges[msg.channel.id].ws.readyState != WebSocket.OPEN) return;
  if (msg.member.user.id == client.user.id) return;
  bridges[msg.channel.id].chatAsEnqueue(msg.member.displayName, msg.content);
}

client.once('ready', () => {
  console.log('Ready!');
  client.user.setActivity("use !collabvm help");
});

client.on('message', msg => {
  try {
  if (msg.content.startsWith('!collabvm ')) processCommand(msg);
  else if (bridges.hasOwnProperty(msg.channel.id)) bridgeToCVM(msg);
  } catch (e) {
    console.error(e);
  }
});
client.login(process.env.TOKEN);
