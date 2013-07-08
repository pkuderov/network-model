/*
    physical port
*/

var PhysicalPort = function(owner, index, upperObject) {
    this.prototype = new ElementaryActionObject();
    ElementaryActionObject.call(this);

    this.objectTypeName = 'port';

    //owner: host | switch    
    this.owner = owner;
    this.index = index;
    //upperObject: netIface | switch
    this.upperObject = upperObject;
    this.setTMDirectionToSend;
    this.toSendTMDirection;
    
    this.toSendQueueSize = 128;
    this.toSend = new Queue(this, 'toSendQueue', this.toSendQueueSize);
    
    this.transferRateByOctets = 512;
    
    //methods
    this.setIndex = function(i) {
        this.index = i;
    }
    this.getObjectName = function() {
        return sprintf("%s.%s%d", this.owner.getObjectName(), this.objectTypeName, this.index);
    }
    this.setTMDirectionToSend = function(toSendTMDirection) {
        this.toSendTMDirection = toSendTMDirection;
    }
    this.unsetTMDirectionToSend = function(toSendTMDirection) {
        this.toSendTMDirection = null;
    }    
    this.receive = function(frame) {
        logf(this, "received frame: %s", frame.toString());
        
        if (this.upperObject) {
            this.upperObject.receive(index, frame);
        }
    }
    this.send = function(frame) {
        this.toSend.push({
            frame: frame
        });
    }
    this.doSendAction = function() {
        if (!this.toSendTMDirection) {
            if (!this.toSend.isEmpty()) {
                logf(this, "dropped frame due to no transmission medium connected: %s", this.toSend.pop().frame.toString());
                return true;
            }
            return false;
        }        
        
        if (this.toSendTMDirection.busy || this.toSend.isEmpty())
            return false;
            
        var args = this.toSend.pop();
        var frame = args.frame;

        logf(this, "sent frame: %s", frame.toString());
        this.toSendTMDirection.receive(frame, Math.floor(frame.getSize() / this.transferRateByOctets));
        
        return true;
    }
    this.doElementaryAction = function() {
        return this.doSendAction();
    }
}
