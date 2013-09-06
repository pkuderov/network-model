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
                
        // add global callbacks
        d3.select(window)
            .on('keyup', this.hKeyUp)
            .on('mouseup', this.hMouseUp);
            
        
        this.redraw();
        this.setEditMode(true);
        
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
            
        this.editMode = isEdit;
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
        
        if (this.editMode) {
            this.showDetails();
        }
    }
    this.test = function() {
        var point = {x: 0, y: 0};
        for (var i = 0; i < 7; i++) {
            this.selectedNodes.push(this.addNode(point));
        }
        var last = this.addNode(point);
        this.linkNodeToSelectedNodes(last);
        this.selectedNodes = [last];        
        this.redraw();
    }
    this.showDetails = function() {
        this.clearFbDetail();
        if (this.selectedNodes.length == 0) {
            this.clearFbDetail();
        }
        else if (this.selectedNodes.length == 1) {
            var node = this.selectedNodes[0];
            var host = node.obj;
            
            if (host instanceof Router) {
                this.showIpDetails(host);
            }
        }
    }
    this.showIpDetails = function(host) {
        var ipAddressesFieldset = this.appendFieldset(this.fbDetail, 'Ip addresses:');
        this.appendDropDown(
            ipAddressesFieldset, 'Select net interface', host.netIfaces, 
            function(d) { return (d instanceof LoopbackNetIface) ? 'loopback' : d.mac; }
        );
    }
    this.appendDropDown = function(element, initialText, data, stringGetter, hMouseOverItem) {
        var container = element.append('div')
            .attr('class', 'dropdown-wrapper');
        var output = container.append('p')
            .text(initialText);
        var list = container.append('ul')
            .attr('class', 'dropdown-list')
            .selectAll('li').data(data);
        
        list.enter().append('li')
            .on('mouseover', hMouseOverItem)
            .on('mouseup', function(d) { 
                    output.text((d instanceof LoopbackNetIface) ? 'loopback' : d.mac); 
                    list.style('display', 'none')
                        .transition()
                        .duration(500)
                        .style('display', null);
                }
            )
            .attr('class', 'dropdown-item')
            .text(stringGetter);
            
        list.exit()
            .remove();
    }
    this.appendFieldset = function(container, legend) {
        var fieldset = container.append('fieldset');
        fieldset.append('legend').text(legend);
        return fieldset;
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
                Visualizer.resetSelection();
            }
            else if (d3.event.ctrlKey) {
                Visualizer.createSelectionRectangle(d3.mouse(this));
                Visualizer.disableZoom();
            }
            else {
                Visualizer.resetSelection();
            }
        }
        
        Visualizer.redraw();
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
            Visualizer.redraw();
        }        
    }    
    this.hMouseDownOnLink = function(d) {
        if (d3.event.button == 0) {
            if (d3.event.ctrlKey) {
                // + ctrl : additive select/deselect
                var ind = Visualizer.selectedLinks.indexOf(d);
                if (ind >= 0)
                    Visualizer.selectedLinks.splice(ind, 1);
                else
                    Visualizer.selectedLinks.push(d);
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
        d3.event.stopPropagation();
    }
    this.hMouseDownOnNode = function(d) {
        if (d3.event.button == 0) {
            // left button
            if (d3.event.ctrlKey) {
                // + ctrl : additive select/deselect
                var ind = Visualizer.selectedNodes.indexOf(d);
                if (ind >= 0)
                    Visualizer.selectedNodes.splice(ind, 1);
                else
                    Visualizer.selectedNodes.push(d);
            }
            else if (d3.event.shiftKey) {
                // + shift : link this node with every selected node
                Visualizer.linkNodeToSelectedNodes(d);
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
                Visualizer.resetSelection();
                Visualizer.enableZoom();
                Visualizer.redraw();
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
        log('find me');
        var svgRect = this.gVisibleContainer.select('.rectSelection'),
            r = this.radius,
            rect = { 
                x1: +svgRect.attr('x') - r, x2 : (+svgRect.attr('x') + (+svgRect.attr('width')) + r),
                y1: +svgRect.attr('y') - r, y2 : (+svgRect.attr('y') + (+svgRect.attr('height')) + r)
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
        d3.select(window).on('mousemove', this.hMouseDrag);
    }
    this.removeSelectionRectangle = function() {
        if (Visualizer.selectionRectangle) {        
            d3.select(window).on('mousemove', null);
            Visualizer.gVisibleContainer.selectAll('.rectSelection').remove();
            Visualizer.selectionRectangle = null;
        }
    }
    this.resetSelection = function() {
        this.selectedNodes = [];
        this.selectedLinks = [];
        this.clearFbDetail();
    }

    // ------------ data manipulations ------------
    this.addNode = function(point) {
        var newObject = Environment.addObject(Environment.createObject(this.newNodeType)),
            newNode = {x: point[0], y: point[1], obj: newObject};
            
        this.nodesData.push(newNode);
        return newNode;
    }
    this.linkNodeToSelectedNodes = function(node) {
        this.selectedNodes.forEach(function(d) {
            var tm = Environment.connectObjects(d.obj, node.obj);
            Visualizer.linksData.push({source: d, target: node, tm: tm});
        });
    }       
    this.removeNode = function(node) {
        var i = this.nodesData.indexOf(node);
        if (i >= 0) {
            this.nodesData.splice(i, 1);
            
            for (i = 0; i < this.linksData.length; i++) {
                var d = this.linksData[i];
                if (d.source == node || d.target == node) {
                    this.linksData.splice(i, 1);
                    i--;
                }
            }            
            Environment.removeObject(node.obj);
        }
    }
    this.removeLink = function(link) {
        var i = this.linksData.indexOf(link);
        if (i >= 0) {
            this.linksData.splice(i, 1);            
            Environment.removeObject(link.tm);
        }
    }
    this.setNewNodeType = function(newNodeType) {
        this.newNodeType = newNodeType;
    }

    //
    this.clearFbDetail = function() {
        this.fbDetail.selectAll('*').remove();
    }    
    
}
