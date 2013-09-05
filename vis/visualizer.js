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
    // link line stroke width
    this.strokeWidth = 3;
            
    this.svgContainer;
    this.gVisibleContainer;
    // nodes and links SELECTIONs
    this.node;
    this.link;
    // its data
    this.nodesData = [];
    this.linksData = [];
        
    this.newNodeType = 'host';
    
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


    this.initialize = function() {
        this.setEditMode(true);
        
        this.zoom = d3.behavior.zoom();
        this.drag = d3.behavior.drag();
                    
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
                .attr('width', this.width * 2)
                .attr('height', this.height * 2)
                .attr('transform', 'translate(' + [-this.width/2, -this.height/2] + ')')
                .attr('fill', 'white');
        
        
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
                
        // add global callbacks
        d3.select(window)
            .on('keydown', this.hKeyDown)
            .on('keyup', this.hKeyUp)
            .on('mouseup', this.hMouseUp);
            
        this.redraw();
    }
    this.setMouseDragHandler = function(handler) {
        d3.select(window)
            .on('mousemove', handler);
    }
    // redraw graph    
    this.redraw = function() {
        // links
        this.link = this.link.data(this.linksData);
        this.link.enter().insert('line', '.node')
            .attr('class', 'link')
            .on('mouseenter', this.hMouseEnterLink)
            .on('mouseleave', this.hMouseLeaveLink)
            .on('mousedown', this.hMouseDownOnLink)
            .attr('stroke-width', this.strokeWidth);
                   
        this.link.exit()
            .remove();
            
        this.link.classed('selected', function(d) { return Visualizer.selectedLinks.indexOf(d) >= 0; });
            
        // nodes
        this.node = this.node.data(this.nodesData);
        this.node.enter().append('circle')
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
                        
        this.node.classed('selected', function(d) { return Visualizer.selectedNodes.indexOf(d) >= 0; });
        
        if (d3.event) {
            // prevent browser's default behavior
            d3.event.preventDefault();
        }
        this.forceLayout.start();
    }
    // ----- zoom -------
    this.enableZoom = function() {
        //restore zoom state

        log('zoom enabled');
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
        log('zoom disabled');
        this.savedZoom = {
            translate: clone(this.zoom.translate()),
            scale: clone(this.zoom.scale())
        };
        this.svgContainer.select('g')
            .call(this.zoom.on('zoom', null));
    }
    
    // EVENT HANDLERS ------------------
    this.hRescale = function() {
        Visualizer.gVisibleContainer.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
    }
    this.hMouseDown = function() {
        if (d3.event.button == 0) {
            // left button
            if (d3.event.shiftKey) {
                // + shift: add node
                if (!Visualizer.mouseDownNode) {
                    Visualizer.linkNodeToSelectedNodes(Visualizer.addNode(d3.mouse(this)));
                    Visualizer.resetSelection();
                }
            }
            else if (d3.event.ctrlKey) {
                if (!Visualizer.mouseDownNode && !Visualizer.mouseDownLink) {
                    Visualizer.createSelectionRectangle(d3.mouse(this));
                    Visualizer.disableZoom();
                }
            }
            else {            
                if ((!Visualizer.mouseDownNode && Visualizer.selectedNodes.length > 0) || (!Visualizer.mouseDownLink && Visualizer.selectedLinks.length > 0)) {
                    Visualizer.resetSelection();
                }
            }
        }
                        
        Visualizer.redraw();
    }
    this.addNode = function(point) {
        var 
            newObject = Environment.addObject(Environment.createObject(this.newNodeType)),
            newNode = {x: point[0], y: point[1], obj: newObject};
            
        this.nodesData.push(newNode);
        return newNode;
    }
    this.linkNodeToSelectedNodes = function(node) {
        this.selectedNodes.forEach(function(d) {
            var port1 = d.obj.addPort(Environment.getNextUniqueMac());
            var port2 = node.obj.addPort(Environment.getNextUniqueMac());
            var tm = Environment.addObject(new TransMedium());
            Environment.connectPorts(port1, port2, tm);
            
            Visualizer.linksData.push({source: d, target: node, tm: tm});
        });
    }
    this.hMouseDrag = function() {
        var point = d3.mouse(Visualizer.gVisibleContainer[0][0]);
          
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
            Visualizer.selectionRectangle = null;
            Visualizer.enableZoom();
            Visualizer.redraw();
        }        
    }    
    this.hMouseEnterNode = function() {
        d3.select(this)
            .attr('r', Visualizer.radius * 1.3);
    }
    this.hMouseLeaveNode = function() {
        d3.select(this)
            .attr('r', Visualizer.radius);
    }    
    this.hMouseEnterLink = function() {
        d3.select(this)
            .attr('stroke-width', Visualizer.strokeWidth * 2);
    }
    this.hMouseLeaveLink = function() {
        d3.select(this)
            .attr('stroke-width', Visualizer.strokeWidth);
    }    
    this.hMouseDownOnLink = function(d) {
        if (d3.event.button == 0) {
            if (d3.event.ctrlKey) {
                // + ctrl : additive select/deselect
                var selectedLinks = Visualizer.selectedLinks;
                var ind = selectedLinks.indexOf(d);
                if (ind >= 0)
                    selectedLinks.splice(ind, 1);
                else
                    selectedLinks.push(d);
            }
            else {
                // + no modifiers
                Visualizer.resetSelection();
                Visualizer.selectedLinks = [d];
            }     
            
            Visualizer.mouseDownLink = d;
            Visualizer.disableZoom();
            Visualizer.redraw();
        }
    }
    this.hMouseDownOnNode = function(d) {
        if (d3.event.button == 0) {
            // left button
            if (d3.event.ctrlKey) {
                // + ctrl : additive select/deselect
                var selectedNodes = Visualizer.selectedNodes;
                var ind = selectedNodes.indexOf(d);
                if (ind >= 0)
                    selectedNodes.splice(ind, 1);
                else
                    selectedNodes.push(d);
            }
            else if (d3.event.shiftKey) {
                // + shift : link this node with every selected node
                NetTopologyEditor.linkToNode(d, Visualizer.selectedNodes);

                Visualizer.resetSelection();
                Visualizer.selectedNodes = [d];
            }
            else {
                // + no modifiers
                Visualizer.resetSelection();
                Visualizer.selectedNodes = [d];
            }            
            
            Visualizer.mouseDownNode = d;   
            Visualizer.disableZoom();         
            Visualizer.redraw();
        }
    }
    this.hKeyDown = function() {
//        log("%d", d3.event.keyCode);
    }
    this.hKeyUp = function() {
//        log("%d", d3.event.keyCode);
        switch (d3.event.keyCode) {
            case 17: { // ctrl
                Visualizer.removeSelectionRectangle();
                break;
            }
            case 82: {
                Visualizer.selectedLinks.forEach(function(d) {
                    NetTopologyEditor.removeLink(d);
                });
                Visualizer.selectedNodes.forEach(function(d) {
                    NetTopologyEditor.removeNode(d);
                });
                Visualizer.resetSelection();
                Visualizer.enableZoom();
                Visualizer.redraw();
                break;
            }
        }
    }
    
    this.hDragNode = function(d) {
        d.x = d3.event.x;
        d.y = d3.event.y;        
        d3.select(this)
            .attr('cx', d.x)
            .attr('cy', d.y);
    }    

    this.hForceLayoutTick = function() {
        Visualizer.link
            .attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });

        Visualizer.node
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; });
    }
    this.selectAreaOfNodes = function() {
        log('find me');
        var svgRect = this.gVisibleContainer.select('.rectSelection'),
            rect = { 
                x1: +svgRect.attr('x'), x2 : (+svgRect.attr('x') + (+svgRect.attr('width'))),
                y1: +svgRect.attr('y'), y2 : (+svgRect.attr('y') + (+svgRect.attr('height')))
            };
            
        this.selectedNodes = this.nodesData.filter(function(d) { 
                return d.x >= rect.x1 && d.x <= rect.x2 && d.y >= rect.y1 && d.y <= rect.y2; 
            });
    }
    this.createSelectionRectangle = function(point) {        
        this.gVisibleContainer.append('rect')
            .attr('class', 'rectSelection')
            .attr('x', point[0])
            .attr('y', point[1]);
                
        this.selectionRectangle = clone(point);
        this.setMouseDragHandler(this.hMouseDrag);
    }
    this.removeSelectionRectangle = function() {
        if (Visualizer.selectionRectangle) {        
            Visualizer.setMouseDragHandler(null);
            Visualizer.gVisibleContainer.selectAll('.rectSelection')
                .remove();
        }
    }
    this.resetSelection = function() {
        this.selectedNodes = [];
        this.selectedLinks = [];
        this.clearFbDetail();
    }

    this.setNewNodeType = function(newNodeType) {
        this.newNodeType = newNodeType;
    }

    //
    this.clearFbDetail = function() {
        d3.select('.fbDetail').selectAll('*').remove();
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
                { text: 'play', onClick: "Executor.play()" },
                { text: 'pause', onClick: "Executor.pause()" },
                { text: 'step', onClick: "Executor.stepForward()" },
                { text: 'edit', onClick: "Visualizer.setEditMode(true)" , id: 'btnEditMode'}
            ];            
            
            this.forceLayout.stop();
        }
        
        d3.select('.fbManage')
            .selectAll('input')
            .remove();
            
        d3.select('.fbManage').selectAll('input').data(buttons)
            .enter()
            .insert('input')
            .attr('type', 'button')
            .attr('value', function(d) { return d.text; })
            .attr('id', function(d) { return d.id; })
            .attr('onClick', function(d) {return d.onClick; });
    }
}
