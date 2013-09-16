var SendInfo = new function() { 

    this.showSendDetails = function(fromHost, toHost) {
        this.fromHost = fromHost;
        this.toHost = toHost;
        
        this.sendFieldset = this.appendSendFieldset(Visualizer.fbDetail);  
        
        if (fromHost)
            this.loadIpList(this.sendFieldset.dropdownFromHost, fromHost);
            
        if (toHost)
            this.loadIpList(this.sendFieldset.dropdownToHost, toHost);
    }
    this.appendSendFieldset = function(container) {
        var fieldset = container.append('fieldset');
        fieldset.append('legend').text('Send details:');
        
        if (this.fromHost)
            var dropdownFromHost = VisInfo.appendDropDown(fieldset, 'Select source IP');
        if (this.toHost)
            var dropdownToHost = VisInfo.appendDropDown(fieldset, 'Select target IP');
            
        var inputFromIp = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Source IP')
            .attr('class', 'input-text')
            .style('width', 100);
        fieldset.append('span').text(' port ');
        var inputFromPort = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'port')
            .attr('class', 'input-text')
            .attr('value', '8080')
            .style('width', 40);

        var inputToIp = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Target IP')
            .attr('class', 'input-text')
            .style('width', 100);
        fieldset.append('span').text(' port ');
        var inputToPort = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'port')
            .attr('class', 'input-text')
            .attr('value', '8080')
            .style('width', 40);
            
        fieldset.append('p');
        var inputMessage = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Message')
            .attr('class', 'input-text');
            
        fieldset.append('br');
        fieldset.append('span').text('xTimes   ');
        var inputXTimes = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'xTimes')
            .attr('class', 'input-text')
            .attr('value', '1')
            .style('width', 50);
            
        fieldset.append('br');
        fieldset.append('span').text('delay    ');
        var inputTicksDelay = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Ticks delay')
            .attr('class', 'input-text')
            .attr('value', '1')
            .style('width', 50);
            
        fieldset.append('p');
        var btnSend = fieldset.append('input')
            .attr('type', 'button')
            .attr('value', 'Send message')
            .on('click', this.hSend);
        
        return {
            fieldset: fieldset,
            dropdownFromHost: dropdownFromHost,
            dropdownToHost: dropdownToHost,
            inputFromIp: inputFromIp,
            inputFromPort: inputFromPort,
            inputToIp: inputToIp,
            inputToPort: inputToPort,
            inputMessage: inputMessage,
            inputXTimes: inputXTimes,
            inputTicksDelay: inputTicksDelay,
            btnSend: btnSend
        };
    }
    this.loadIpList = function(container, host) {
        var items = [];
        for (var i = 0; i < host.netIfaces.length; i++) {
            var netIface = host.netIfaces[i];
            items.push({ obj: netIface, str: VisInfo.getNetIfaceName(netIface) });
            for (var j = 0; j < netIface.addresses.length; j++) {
                var ip = netIface.addresses[j].ip;
                items.push({ obj: ip, str: ipIntToString(ip) });
            }
        }
               
        container.item = container.item.data(items);
        container.item.enter().append('li')
            .on('mouseenter', this.hMouseEnterItem)
            .on('mouseleave', this.hMouseLeaveItem)
            .on('mouseup', function(d) { SendInfo.hMouseUpOnIpItem(container, d); })
            .attr('class', 'dropdown-item')
            .text(function(d) { return d.str; })
            .style('font-weight', function(d) { return (d.obj instanceof NetIface) ? 'bold' : null; })
            .style('background-color', function (d) { return (d.obj instanceof NetIface) ? 'whitesmoke' : null; });
            
        container.item.exit().remove();
        
        if (items.length == 0)
            VisInfo.setDisabledColor(container.pOutput, VisInfo.colorDisabled);
        else
            VisInfo.setDisabledColor(container.pOutput, null);
            
        container.pOutput.text(container.pOutput.node().initialText);
    }
    // ------------- EVENT HANDLERS -----------------
    this.hMouseUpOnIpItem = function(container, d) { 
        if (d.obj instanceof NetIface)
            return;
            
        var ip = d.obj;
        VisInfo.selectDropdownItem(container, ipIntToString(ip)); 
        
        if (container == SendInfo.sendFieldset.dropdownFromHost) {
            SendInfo.sendFieldset.inputFromIp
                .attr('value', ipIntToString(ip));
        }
        else {
            SendInfo.sendFieldset.inputToIp
                .attr('value', ipIntToString(ip));
        }
    }
    this.hSend = function() {
        var fieldset = SendInfo.sendFieldset;
        var valid = true;
        
        var fromIp = ipStringToInt(fieldset.inputFromIp.property('value')); 
        var fromPort = strToInt(fieldset.inputFromPort.property('value'));   
                
        var toIp = ipStringToInt(fieldset.inputToIp.property('value'));     
        var toPort = strToInt(fieldset.inputToPort.property('value')); 
        
        var message = fieldset.inputMessage.property('value');
        
        var xTimes = strToInt(fieldset.inputXTimes.property('value'));
        var ticksDelay = strToInt(fieldset.inputTicksDelay.property('value'));

        VisInfo.setAndResetWithDelay(fieldset.inputFromIp, 'border-color', (null == fromIp) ? 'red' : 'lightgreen', null, 1000);
        VisInfo.setAndResetWithDelay(fieldset.inputFromPort, 'border-color', (null == fromPort) ? 'red' : 'lightgreen', null, 1000);
        VisInfo.setAndResetWithDelay(fieldset.inputToIp, 'border-color', (null == toIp) ? 'red' : 'lightgreen', null, 1000);
        VisInfo.setAndResetWithDelay(fieldset.inputToPort, 'border-color', (null == toPort) ? 'red' : 'lightgreen', null, 1000);
        VisInfo.setAndResetWithDelay(fieldset.inputXTimes, 'border-color', (null == xTimes) ? 'red' : 'lightgreen', null, 1000);
        VisInfo.setAndResetWithDelay(fieldset.inputTicksDelay, 'border-color', (null == ticksDelay) ? 'red' : 'lightgreen', null, 1000);

        valid = valid && (null != fromIp);
        valid = valid && (null != fromPort);
        valid = valid && (null != toIp);
        valid = valid && (null != toPort);
        valid = valid && (null != xTimes);
        valid = valid && (null != ticksDelay);
        
        if (valid) {
            var fromHost = SendInfo.fromHost;
            for (var i = 0; i < xTimes; i++) {
                var msDelay = i * ticksDelay;
                Executor.addJob(
                    function() {
                        Environment.sendTo(fromHost, fromIp, fromPort, toIp, toPort, message);
                    },
                    msDelay
                );
            }
        }
    }
    this.hMouseEnterDropdownItem = function(d) {
        var netIface = d.obj;
        
        if (!(netIface instanceof NetIface))
            return;
        if (netIface instanceof LoopbackNetIface)
            return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, 'green');
    }    
    this.hMouseLeaveDropdownItem = function(d) {
        var netIface = d.obj;
        
        if (!(netIface instanceof NetIface))
            return;
        if (netIface instanceof LoopbackNetIface)
            return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, null);
    }
}
