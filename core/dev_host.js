var Host = function(name) {    
    //this.prototype = new Router(name);
    Router.call(this, name);

    this.objectTypeName = 'host';

    //add host-specific protocol handlers
    this.protocolHandlers.UDP = new UDPHandler(this);
}


