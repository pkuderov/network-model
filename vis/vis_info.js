var VisInfo = new function() {
    this.colorDisabled = '#DEDEDE';
        
    this.showDetails = function(editMode, nodes, links) {
        Visualizer.clearFbDetail();
        
        if (editMode) {
            if (nodes.length == 1) {
                var host = nodes[0].obj;
                
                if (host instanceof Router) {
                    IpInfo.showIpDetails(host);
                }
            }
        }
    }
    this.appendDropDown = function(container, initialText, disabled) {
        var divWrapper = container.append('div')
            .attr('class', 'dropdown-wrapper');
        var pOutput = divWrapper.append('p')
            .text(initialText)
            .property('initialText', initialText);
        var ulList = divWrapper.append('ul')
            .attr('class', 'dropdown-list');
        var item = ulList.selectAll('li');
        
        this.setDisabledColor(pOutput, disabled);
            
        return {divWrapper: divWrapper, pOutput: pOutput, ulList: ulList, item: item};
    }
    this.selectDropdownItem = function(dropdown, selectedText) {
        dropdown.pOutput.text(selectedText);
        this.setAndResetWithDelay(dropdown.ulList, 'display', 'none', null, 100);
    }
    this.markLinkByColor = function(tm, color) {
        Visualizer.link.filter(function(d) { return d.tm == tm; })
            .style('stroke', color);
    }
    this.setDisabledColor = function(obj, disabled) {
        obj.style('color', disabled ? this.colorDisabled : null);
    }
    this.setAndResetWithDelay = function(obj, styleName, initialStyle, resultStyle, delay) {
        obj.style(styleName, initialStyle)
            .transition()
            .delay(delay)
            .style(styleName, resultStyle);
    }
    this.getNetIfaceName = function(netIface) {
        return (netIface instanceof LoopbackNetIface) ? 'loopback' : netIface.mac;
    }    
}
