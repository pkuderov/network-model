/*
        to delete
*/
/*
        "Berkeley sockets"-like object only for UDP-IPv4
*/
/*
UDPPort = function() {
	this.name = "UDPPort";
	this.lower_protocol = "UDP";
	
	this.to_receive_size = 0;
	this.to_send_size = 1;
};
	
HUDPPort = function(owner, number) {
	this.number = number;
	this.owner = owner;
	
	this.to_send = new Queue(this.to_send_size);        
	this.to_receive = new Queue(this.to_receive_size);
};
HUDPPort.prototype.receive = function(dst_ip, dst_port, data) {
	if (this.to_receive.is_full())
		this.to_receive.clear();
	
	this.to_receive.push({
		dst_ip: dst_ip,
		dst_port: dst_port,
		datagram: datagram
	});
};

HUDPPort.prototype.send = function(src_ip, dst_ip, dst_port, data) {
	this.owner.protocols[this.lower_protocol].send(
		
	);
}

UDPSocket = function(owner, port, addr) {
	this.owner = owner;
		
	if (addr == null)
		this.default_addr = HIPv4.inaddr_any;
	else
		this.default_addr = addr;
	this.default_port = port;	
};

HUDPSocket.prototype.do_receive_action = function() {
	if (this.port != 0) {
		
	}
	for (var i = 0; i < this.owner.ports.length; i++) {
		
	}
}
HUDPSocket.prototype.send = function(src_ip, src_port, dst_ip, dst_port, data) {
	this.to_send.push({
		src_ip: src_ip,
		src_port: src_port,
		dst_ip: dst_ip,
		dst_port: dst_port,
		data: data
	});
}
HUDPSocket.prototype.do_send_action = function() {
	if (this.to_send.is_empty())
		return 0;
	var args = this.to_send.pop();
	var src_ip = args.src_ip;
	var src_port = args.src_port;
	var dst_ip = args.dst_ip;
	var dst_port = args.dst_port;
	var data = args.data;
	
	if (src_port == null)
		src_port = this.default_port;
	if (src_ip == null)
		src_ip = this.default_addr;
	var datagram = new UDPDatagram(src_port, dst_port, data);
	
	this.owner.protocols[this.lower_protocol].send(
		src_ip, dst_ip, datagram
	);
}

*/
