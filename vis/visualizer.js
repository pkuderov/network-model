var Visualizer = new function() {
    // graph force layout
    this.forceLayout;
    // graph force layout defaults
    this.linkDistance = 50;
    this.charge = -200;
    // chart properties
    this.height = 720;
    this.width = 720;
    this.radius = 10;
    this.gScale = 3;
    // link line stroke width
    this.strokeWidth = 3;
            
    this.svgContainer;
    this.gVisibleContainer;
    this.fbDetail;
    // nodes and links SELECTIONs
    this.node;
    this.link;
    // its data
    this.nodesData = [];
    this.linksData = [];
            
    //saved zoom/drag behavior
    this.zoom;
    this.drag;

    // Visualizer intermediate event vars
    this.selectedNodes = [];
    this.selectedLinks = [];
    this.mouseDownLink = null;
    this.mouseDownNode = null;
    this.selectionRectangle = null;
    this.savedZoom = {};
    this.newNodeType = 'host';
    this.editMode = false;
    
    this.initialize = function() {        
        this.zoom = d3.behavior.zoom();
        this.drag = d3.behavior.drag();
                    
        this.fbDetail = d3.select('.fbDetail');
        // init svg
        this.svgContainer = d3.select('.fbChart')
            .append('svg:svg')
                .attr('width', this.width)
                .attr('height', this.height)
                .attr('pointer-events', 'all');        
            
        this.gVisibleContainer = this.svgContainer
            .append('g')
                .call(this.zoom.on('zoom', this.hRescale))
                .on('dblclick.zoom', null)
            .append('g')
                .on('mousedown', this.hMouseDown);
                        
        this.gVisibleContainer
            .append('rect')
                .attr('width', this.width * this.gScale)
                .attr('height', this.height * this.gScale)
                .attr('transform', 'translate(' + [(1 - this.gScale)*this.width/2, (1 - this.gScale)*this.height/2] + ')')
                .attr('fill', 'white')
                .attr('stroke', 'grey')
                .attr('stroke-width', 1);
        
        
        this.node = this.gVisibleContainer.selectAll('.node');
        this.link = this.gVisibleContainer.selectAll('.link');
        
        // init force layout
        this.forceLayout = d3.layout.force()
            .size([this.width, this.height])
            .nodes(this.nodesData)
            .links(this.linksData)
            .linkDistance(this.linkDistance)
            .charge(this.charge)
            .on('tick', this.hForceLayoutTick);
            
        VisLabels.initialize();
                
        // add global callbacks
        d3.select(window)
            .on('keyup', this.hKeyUp)
            .on('mouseup', this.hMouseUp);
            
        
        this.setEditMode(true);
        this.redrawGraph();
        
        this.test();
    }    
    this.setEditMode = function(isEdit) {            
        if (isEdit) {                
            var buttons = [
                { text: 'host', onClick: "Visualizer.setNewNodeType('host')" },
                { text: 'router', onClick: "Visualizer.setNewNodeType('router')" },
                { text: 'switch', onClick: "Visualizer.setNewNodeType('switch')" },
                { text: 'freeze', onClick: "Visualizer.setEditMode(false)" , id: 'btnEditMode'}
            ];            
                    
            Executor.pause();
        }
        else {
            var buttons = [
                { text: 'play', onClick: "Visualizer.switchState()", id: 'btnSwitchState' },
                { text: 'step', onClick: "Visualizer.stepForward()" },
                { placeholder: 'tick rate', type: 'text', id: 'executorRate' },
                { text: 'set rate', onClick: "Visualizer.setExecutorRate()" },
                { text: 'edit', onClick: "Visualizer.setEditMode(true)" , id: 'btnEditMode'}
            ];
        }
        
        d3.select('.fbManage')
            .selectAll('input')
            .remove();
            
        d3.select('.fbManage').selectAll('input').data(buttons)
            .enter()
            .insert('input')
            .attr('type', function(d) {return d.type ? d.type : 'button'; })
            .attr('value', function(d) { return d.text; })
            .attr('id', function(d) { return d.id; })
            .attr('placeholder', function(d) { return d.placeholder; })
            .attr('onClick', function(d) {return d.onClick; });
            
        d3.select('.fbManage').select('#executorRate')
            .style('width', 50)
            .attr('value', Executor.pauseBetweenTicksInMs);
            
        this.editMode = isEdit;
        
        this.redrawDetails();
    }
    this.redrawGraph = function() {
    
        this.link = this.link.data(this.linksData, function(d) { return Visualizer.linksData.indexOf(d); });
        this.link.enter().insert('line', '.node')
            .attr('class', 'link')
            .on('mouseenter', this.hMouseEnterLink)
            .on('mouseleave', this.hMouseLeaveLink)
            .on('mousedown', this.hMouseDownOnLink)
            .attr('stroke-width', this.strokeWidth);
                   
        this.link.exit()
            .remove();
            
        // nodes
        this.node = this.node.data(this.nodesData, function(d) { return Visualizer.nodesData.indexOf(d); });
        this.node.enter().insert('circle', '.label')
            .attr('class', function(d) { return d.obj.objectTypeName + ' node'; })
            .on('mouseenter', this.hMouseEnterNode)
            .on('mouseleave', this.hMouseLeaveNode)
            .on('mousedown', this.hMouseDownOnNode)
            .call(this.drag.on('drag', this.hDragNode))
            .call(this.forceLayout.drag)
            .attr('r', this.radius / 2)
            .transition()
            .duration(750)
            .ease('elastic')
            .attr('r', this.radius);
                       
        this.node.exit()
            .transition()
            .duration(500)
            .attr('r', 0)
            .remove();
                                
        VisLabels.redrawGraphLabels();
        
        if (d3.event) {
            // prevent browser's default behavior
            d3.event.preventDefault();
        }
        
        this.forceLayout.start();
    }
    this.redrawOnSelectionChanged = function() {
        this.link.classed('selected', function(d) { return Visualizer.selectedLinks.indexOf(d) >= 0; });
        this.node.classed('selected', function(d) { return Visualizer.selectedNodes.indexOf(d) >= 0; });
        
        VisLabels.redrawOnSelectionChanged();
        
        this.redrawDetails();
    }
    this.redrawDetails = function() {
        VisInfo.showDetails(this.editMode, this.selectedNodes, this.selectedLinks);
    }
    this.redrawMessages = function() {
        var messages = [];
        for (var i = 0; i < this.linksData.length; i++ ) {
            var link = this.linksData[i];
            if (link.tm.directions.toPort1.busy) {
                messages.push({
                    link: link,
                    source: link.target,
                    target: link.source,
                    percent: link.tm.directions.toPort1.getFrameDeliveryPercent()
                });
            }
            if (link.tm.directions.toPort2.busy) {
                messages.push({
                    link: link,
                    source: link.source,
                    target: link.target,
                    percent: link.tm.directions.toPort2.getFrameDeliveryPercent()
                });
            }
        }
        var r = this.radius;
        this.gVisibleContainer.selectAll('.message').remove();
        
        if (messages.length == 0)
            return;
        
        this.gVisibleContainer.selectAll('.message').data(messages).enter().insert('circle')
            .attr('class', 'message')
            .attr('r', 3)
            .attr('fill', 'red')
            .each(function(d) {
                    var dx = d.target.x - d.source.x;
                    var dy = d.target.y - d.source.y;
                    var dist = Math.sqrt(dx*dx + dy*dy);
                    d.p = ((dist - 2 * r) * d.percent + r) / dist;
                }
            )
            .attr('cx', function(d) { return d.source.x + d.p * (d.target.x - d.source.x); })
            .attr('cy', function(d) { return d.source.y + d.p * (d.target.y - d.source.y); });
    }
    this.test = function() {
        var point = [0, 0];
        for (var i = 0; i < 7; i++) {
            this.selectedNodes.push(this.addNode(point));
        }
        this.setNewNodeType('switch');
        var last = this.addNode(point);
        this.linkNodeToSelectedNodes(last);
        this.setSelection([last]);
    }
    this.test2 = function() {
        var point = [0, 0];
        var x = this.addNode(point);
        this.setSelection([x]);
        var y = this.addNode(point);
        
        this.linkNodeToSelectedNodes(y);
        
        x.obj.netIfaces[1].addIp(ipStringToInt('192.168.55.212'), netmaskShortToFull(28));
        y.obj.netIfaces[1].addIp(ipStringToInt('192.168.55.211'), netmaskShortToFull(28));
        x.obj.protocolHandlers.UDP.send(ipStringToInt('192.168.55.212'), 8080, ipStringToInt('192.168.55.211'), 8090, 
"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        );
    }
    // EVENT HANDLERS ------------------
    this.hRescale = function() {
        Visualizer.gVisibleContainer.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
    }
    this.hMouseDown = function() {
        if (d3.event.button == 0) {
            // left button
            if (d3.event.shiftKey) {
                // + shift: add node + link to selected nodes
                Visualizer.linkNodeToSelectedNodes(Visualizer.addNode(d3.mouse(this)));
                Visualizer.setSelection();
            }
            else if (d3.event.ctrlKey) {
                Visualizer.createSelectionRectangle(d3.mouse(this));
                Visualizer.disableZoom();
            }
            else {
                Visualizer.setSelection();
            }
        }        
    }
    this.hMouseDrag = function() {
        var point = d3.mouse(Visualizer.gVisibleContainer.node());
          
        Visualizer.gVisibleContainer.select('.rectSelection')
            .attr('x', Math.min(point[0], Visualizer.selectionRectangle[0]))
            .attr('y', Math.min(point[1], Visualizer.selectionRectangle[1]))
            .attr('width',  Math.abs(point[0] - Visualizer.selectionRectangle[0]))
            .attr('height',  Math.abs(point[1] - Visualizer.selectionRectangle[1]));
    }
    
    this.hMouseUp = function() {
        if (Visualizer.mouseDownNode || Visualizer.mouseDownLink) {
            Visualizer.mouseDownNode = null;
            Visualizer.mouseDownLink = null;
            Visualizer.enableZoom();
        }
        else if (Visualizer.selectionRectangle) {
            Visualizer.selectAreaOfNodes();
            Visualizer.removeSelectionRectangle();
            Visualizer.enableZoom();
        }        
    }    
    this.hMouseDownOnLink = function(d) {
        if (d3.event.button == 0) {
            if (d3.event.ctrlKey) {
                // + ctrl : additive select/deselect
                Visualizer.xorAddToSelection(null, [d]);
            }
            else {
                // + no modifiers
                Visualizer.setSelection(null, [d]);
            }     
            
            Visualizer.mouseDownLink = d;
            Visualizer.disableZoom();
        }
        d3.event.stopPropagation();
    }
    this.hMouseDownOnNode = function(d) {
        if (d3.event.button == 0) {
            // left button
            if (d3.event.ctrlKey) {
                // + ctrl : additive select/deselect
                Visualizer.xorAddToSelection([d]);
            }
            else if (d3.event.shiftKey) {
                // + shift : link this node with every selected node
                Visualizer.linkNodeToSelectedNodes(d);
                Visualizer.setSelection([d]);
            }
            else {
                // + no modifiers
                Visualizer.setSelection([d], null);
            }            
            
            Visualizer.mouseDownNode = d;   
            Visualizer.disableZoom();
        }
        d3.event.stopPropagation();
    }
    this.hKeyUp = function() {
        //log("%d", d3.event.keyCode);
        switch (d3.event.keyCode) {
            case 17: { // ctrl
                Visualizer.removeSelectionRectangle();
                break;
            }
            case 82: {
                Visualizer.selectedLinks.forEach(function(d) {
                    Visualizer.removeLink(d);
                });
                Visualizer.selectedNodes.forEach(function(d) {
                    Visualizer.removeNode(d);
                });
                Visualizer.setSelection();
                Visualizer.enableZoom();
                break;
            }
        }
    }
    this.hMouseEnterNode = function() {
        d3.select(this).attr('r', Visualizer.radius * 1.3);
    }
    this.hMouseLeaveNode = function() {
        d3.select(this).attr('r', Visualizer.radius);
    }    
    this.hMouseEnterLink = function() {
        d3.select(this).attr('stroke-width', Visualizer.strokeWidth * 2);

    }
    this.hMouseLeaveLink = function() {
        d3.select(this).attr('stroke-width', Visualizer.strokeWidth);
    }    
    
    this.hDragNode = function(d) {
        d.x = d3.event.x;
        d.y = d3.event.y;        
        d3.select(this)
            .attr('cx', d.x)
            .attr('cy', d.y);
    } 
    this.hForceLayoutTick = function() {
        VisLabels.forceLayout.start();
        
        Visualizer.link
            .attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });

        Visualizer.node
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; });
    }
    // ------------- zoom ---------------
    this.enableZoom = function() {
        //restore zoom state

        //log('zoom enabled');
        this.zoom
            .translate(this.savedZoom.translate)
            .scale(this.savedZoom.scale);
            
        this.svgContainer.select('g')
            .call(this.zoom.on('zoom', this.hRescale))
            .on('dblclick.zoom', null);
        
        d3.event.translate = clone(this.zoom.translate());
        d3.event.scale = clone(this.zoom.scale());
    }
    this.disableZoom = function() {
        //log('zoom disabled');
        this.savedZoom = {
            translate: clone(this.zoom.translate()),
            scale: clone(this.zoom.scale())
        };
        this.svgContainer.select('g')
            .call(this.zoom.on('zoom', null));
    }

    // ----------- selection area & selections ----------
    this.selectAreaOfNodes = function() {
        var svgRect = this.gVisibleContainer.select('.rectSelection'),
            r = this.radius,
            rect = { 
                x1: +svgRect.attr('x') - r, x2 : (+svgRect.attr('x') + (+svgRect.attr('width')) + r),
                y1: +svgRect.attr('y') - r, y2 : (+svgRect.attr('y') + (+svgRect.attr('height')) + r)
            };
            
        
        var toSelect = this.nodesData.filter(function(d) { 
            return d.x >= rect.x1 && d.x <= rect.x2 && d.y >= rect.y1 && d.y <= rect.y2; 
        });
        this.setSelection(toSelect, null);
    }
    this.createSelectionRectangle = function(point) {        
        this.gVisibleContainer.append('rect')
            .attr('class', 'rectSelection')
            .attr('x', point[0])
            .attr('y', point[1]);
                
        this.selectionRectangle = clone(point);
        d3.select(window).on('mousemove', this.hMouseDrag);
    }
    this.removeSelectionRectangle = function() {
        if (Visualizer.selectionRectangle) {        
            d3.select(window).on('mousemove', null);
            Visualizer.gVisibleContainer.selectAll('.rectSelection').remove();
            Visualizer.selectionRectangle = null;
        }
    }
    this.setSelection = function(nodes, links) {
        this.selectedNodes = (nodes) ? nodes : [];
        this.selectedLinks = (links) ? links : [];
        
        this.redrawOnSelectionChanged();
    }
    this.xorAddToSelection = function(nodes, links) {
        if (nodes) {
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                var ind = this.selectedNodes.indexOf(node);
                if (ind >= 0)
                    this.selectedNodes.splice(ind, 1);
                else
                    this.selectedNodes.push(node);
            }
        }
        
        if (links) {
            for (var i = 0; i < links.length; i++) {
                var link = links[i];
                var i = this.selectedLinks.indexOf(link);
                if (i >= 0)
                    this.selectedLinks.splice(i, 1);
                else
                    this.selectedLinks.push(link);
            }
        }
            
        this.redrawOnSelectionChanged();
    }

    // ------------ data manipulations ------------
    this.addNode = function(point) {
        var newObject = Environment.addObject(Environment.createObject(this.newNodeType)),
            newNode = {x: point[0], y: point[1], obj: newObject};
            
        this.nodesData.push(newNode);
        VisLabels.addNode(newNode);
        
        this.redrawGraph();
        
        return newNode;
    }
    this.linkNodeToSelectedNodes = function(node) {
        this.selectedNodes.forEach(function(d) {
            var tm = Environment.connectObjects(d.obj, node.obj);
            Visualizer.linksData.push({source: d, target: node, tm: tm});
        });
        
        this.redrawGraph();
    }       
    this.removeNode = function(node) {
        var i = this.nodesData.indexOf(node);
        if (i >= 0) {
            VisLabels.removeNode(node, i);
            
            this.nodesData.splice(i, 1);
            
            for (i = 0; i < this.linksData.length; i++) {
                var d = this.linksData[i];
                if (d.source == node || d.target == node) {
                    this.linksData.splice(i, 1);
                    i--;
                }
            }            
            Environment.removeObject(node.obj);
            
            this.redrawGraph();
        }
    }
    this.removeLink = function(link) {
        var i = this.linksData.indexOf(link);
        if (i >= 0) {
            this.linksData.splice(i, 1);            
            Environment.removeObject(link.tm);
            
            this.redrawGraph();
        }
    }
    this.setNewNodeType = function(newNodeType) {
        this.newNodeType = newNodeType;
    }
    this.switchState = function() {
        var button = d3.select('.fbManage').select('#btnSwitchState');
        
        if (Executor.isPaused()) {
            button.property('value', 'pause');
            Executor.play();
        }
        else {
            button.property('value', 'play');
            Executor.pause();
        }
    }
    this.stepForward = function() {
        if (!Executor.isPaused())
            this.switchState();
            
        Executor.stepForward();
    }
    this.setExecutorRate = function() {
        var input = d3.select('.fbManage').select('#executorRate');
        var rate = strToInt(input.property('value'));        
        var valid = rate != null && rate > 5;
        
        VisInfo.setAndResetWithDelay(input, 'border-color', (!valid) ? 'red' : 'lightgreen', null, 1000);
        if (valid)
            Executor.pauseBetweenTicksInMs = rate;
    }
}
