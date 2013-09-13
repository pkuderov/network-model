var RouteInfo = new function() { 

    this.showRouteDetails = function(host) {
        this.host = host;
        this.routeFieldset = this.appendRouteFieldset(Visualizer.fbDetail, host);
        
        var ddNetIface = this.routeFieldset.dropdownNetIfaces;
        ddNetIface.item = ddNetIface.item.data(host.netIfaces);
        ddNetIface.item.enter().append('li')
            .on('mouseenter', this.hMouseEnterDropdownItem)
            .on('mouseleave', this.hMouseLeaveDropdownItem)
            .on('mouseup', this.hMouseUpOnNetIfaceItem)
            .attr('class', 'dropdown-item')
            .text(VisInfo.getNetIfaceName);
    }
    this.appendRouteFieldset = function(container, host) {
        var fieldset = container.append('fieldset');
        fieldset.append('legend').text('Routes:');
        
        var dropdownNetIfaces = VisInfo.appendDropDown(fieldset, 'Select net interface');
        var dropdownRoutes = VisInfo.appendDropDown(fieldset, 'Select route', true);
        
        var btnRemoveRoute = fieldset.append('input')
            .attr('type', 'button')
            .attr('value', 'Remove route')
            .attr('disabled', 'disabled');
            
        fieldset.append('p')
            .text('Type ip/netmask, gateway ip and metrics');
            
        var inputIpNetmask = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'X.X.X.X/netmask')
            .attr('class', 'input-text')
            .style('width', 120);

        var inputGateway = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'X.X.X.X')
            .attr('class', 'input-text')
            .style('width', 100);
        var inputMetrics = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'metrics')
            .attr('class', 'input-text')
            .text('1')
            .style('width', 50);
            
        var btnAddRoute = fieldset.append('input')
            .attr('type', 'button')
            .attr('value', 'Add route')
            .attr('disabled', 'disabled');
        
        return {
            fieldset: fieldset,
            dropdownNetIfaces: dropdownNetIfaces,
            dropdownRoutes: dropdownRoutes,
            btnRemoveRoute: btnRemoveRoute,
            inputIpNetmask: inputIpNetmask,
            inputGateway: inputGateway,
            inputMetrics: inputMetrics,
            btnAddRoute: btnAddRoute
        };
    }
    this.loadRouteList = function(netIface) {            
        var ddRoutes = this.routeFieldset.dropdownRoutes;
        var routes = [];
        for (var i = 0; i < this.host.routingTable.table.length; i++) {
            var route = this.host.routingTable.table[i];
            if (route.netIface == netIface)
                routes.push(route);
        }
               
        ddRoutes.item = ddRoutes.item.data(routes);
        ddRoutes.item.enter().append('li')
            .on('mouseup', this.hMouseUpOnRouteItem) 
            .attr('class', 'dropdown-item')
            .text(this.routeObjToString);
            
        ddRoutes.item.exit().remove();
        
        if (routes.length == 0)
            VisInfo.setDisabledColor(ddRoutes.pOutput, VisInfo.colorDisabled);
        else
            VisInfo.setDisabledColor(ddRoutes.pOutput, null);
            
        ddRoutes.pOutput.text(ddRoutes.pOutput.node().initialText);
    }
    this.routeObjToString = function(route) {
        return sprintf('%s/%d => %s', ipIntToString(route.ip), netmaskFullToShort(route.netmask), ipIntToString(route.gateway));
    }
    // ------------- EVENT HANDLERS -----------------
    this.hMouseUpOnNetIfaceItem = function(netIface) { 
        VisInfo.selectDropdownItem(RouteInfo.routeFieldset.dropdownNetIfaces, VisInfo.getNetIfaceName(netIface)); 
        
        RouteInfo.routeFieldset.btnAddRoute
            .on('click', RouteInfo.hAddRoute)
            .property('netIface', netIface)
            .attr('disabled', null);
            
        RouteInfo.routeFieldset.btnRemoveRoute
            .property('netIface', netIface);
            
        RouteInfo.loadRouteList(netIface); 
    }
    this.hMouseUpOnRouteItem = function(route) { 
        VisInfo.selectDropdownItem(RouteInfo.routeFieldset.dropdownRoutes, RouteInfo.routeObjToString(route)); 
        
        RouteInfo.routeFieldset.btnRemoveRoute
            .on('click', RouteInfo.hRemoveRoute)
            .property('route', route)
            .attr('disabled', null);
    }
    this.hAddRoute = function() {
        var fieldset = RouteInfo.routeFieldset;
        var address = addressStringToObj(fieldset.inputIpNetmask.property('value'));
        var gateway = ipStringToInt(fieldset.inputGateway.property('value'));
        var metrics = strToInt(fieldset.inputMetrics.property('value'));
        
        VisInfo.setAndResetWithDelay(fieldset.inputIpNetmask, 'border-color', (address == null) ? 'red' : 'lightgreen', null, 1000);
        VisInfo.setAndResetWithDelay(fieldset.inputGateway, 'border-color', (gateway == null) ? 'red' : 'lightgreen', null, 1000);
        
        if (address != null && gateway != null) {
            RouteInfo.host.routingTable.addRoute(address.ip, address.netmask, gateway, this.netIface, metrics);
            RouteInfo.loadRouteList(this.netIface);
        }
    }
    this.hRemoveRoute =  function() { 
        var route = this.route;
        RouteInfo.host.routingTable.removeRoute(route.ip, route.netmask, route.gateway, route.netIface);
                    
        RouteInfo.loadRouteList(this.netIface);
    }
    this.hMouseEnterDropdownItem = function(netIface) {
        if (netIface instanceof LoopbackNetIface)
            return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, 'green');
    }    
    this.hMouseLeaveDropdownItem = function(netIface) {
        if (netIface instanceof LoopbackNetIface)
            return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, null);
    }
}
