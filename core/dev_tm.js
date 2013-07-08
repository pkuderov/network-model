/*
    Layer 1: Physical. Device: Transmission Medium
*/

var TransMedium = function(ticksToTransfer) {
    this.objectTypeName = 'tm';
    this.directions = {};

    if (ticksToTransfer == undefined)
        this.ticksToTransfer = 1;
    else    
        this.ticksToTransfer = ticksToTransfer;

    //methods
    this.getObjectName = function() {
        return this.objectTypeName;
    }
    this.connectPorts = function(port1, port2) {
        this.directions = {};
        this.directions.toPort1 = new TransMediumDirection(this, port2, port1);
        this.directions.toPort2 = new TransMediumDirection(this, port1, port2);

        port1.setTMDirectionToSend(this.directions.toPort2);
        port2.setTMDirectionToSend(this.directions.toPort1);
    }
    this.disconnectPorts = function() {
        this.directions.toPort1.toPort.unsetTMDirectionToSend();
        this.directions.toPort2.toPort.unsetTMDirectionToSend();
        
        this.directions = {};
    }
    this.addActiveElementaryObjects = function(activeObjects) {
        if (this.directions) {
            for(var direction in this.directions) {
                this.directions[direction].addActiveElementaryObjects(activeObjects);
            }
        }
    }
};
var TransMediumDirection = function(owner, fromPort, toPort) {
    //this.prototype = new ElementaryActionObject();
    ElementaryActionObject.call(this);

    //owner: transMedium
    this.owner = owner;
    this.fromPort = fromPort;
    this.toPort = toPort;

    //methods
    this.getObjectName = function() {
        return sprintf("%s.<%s> → <%s>", this.owner.getObjectName(), this.fromPort.getObjectName(), this.toPort.getObjectName());
    }
    this.resetOptions = function() {
        this.busy = false;
        this.frame = undefined;
        this.ticksToFlushPortsBuffer = undefined;
        this.transferStartTick = undefined;
    };
    this.isDelivered = function() {
        return this.busy && (Executor.currentTick - this.transferStartTick) >= (this.owner.ticksToTransfer + this.ticksToFlushPortsBuffer);
    }
    this.randomDropFrame = function() {
        if (Math.random() < 0.01) {
            logf(this, "frame damaged during transfer: %s", this.frame.toString());
            this.resetOptions();
            return true;
        }
    }
    this.doElementaryAction = function() {
        if (this.busy) {
            if (this.randomDropFrame())
                return true;
            
            if (this.isDelivered()) {
                this.send();
                return true;
            }
        }
        return false;
    }
    this.receive = function(frame, ticksToFlushPortsBuffer) {
        this.busy = true;
        this.frame = frame;
        this.ticksToFlushPortsBuffer = ticksToFlushPortsBuffer;
        this.transferStartTick = Executor.currentTick;
        
        logf(this, "received frame");
    }
    this.send = function() {
        this.toPort.receive(this.frame);
        this.resetOptions();    
    }
    this.getFrameDeliveryPercent = function() {
        if (this.busy) {
            return (Executor.currentTick - this.transferStartTick) / (this.owner.ticksToTransfer + this.ticksToFlushPortsBuffer);
        }
    }
    
    //initialization        
    this.resetOptions();
};       
