var Constructor = new function() {
    this.height = 720;
    this.width = 720;
    this.fillColors = d3.scale.category20();
    this.linkDistance = 50;
    this.charge = -200;
    this.radius = 10;
        
    this.outerSvg;
    this.visBox;
    this.forceLayout;
    this.node;
    this.nodesData = [];
    this.link;
    this.linksData = [];
    
    // mouse event vars
    this.eventVars = {
        selectedNodes: [],
        selectedLinks: [],
        mouseDownLink: null,
        mouseDownNode: null,
        selectionRectangleCoordinates: null,
        savedZoomValues: {},
        currentNewNodeType: 'host'
    };
        
    this.clearAll = function() {
        if (this.visBox)
            this.visBox.remove();
        if (this.outerSvg)
            this.outerSvg.remove();
        
        // todo clearAll
    }
        
    this.initialize = function() {
        this.clearAll();
        
        // init svg
        this.outerSvg = d3.select('.fb_chart')
            .append('svg:svg')
                .attr('width', this.width)
                .attr('height', this.height)
                .attr('pointer-events', 'all');
        
        this.zoom = d3.behavior.zoom();
        
        d3.select(window)
            .on('mouseup', this.mouseUp);
            
        this.visBox = this.outerSvg
            .append('g')
                .call(this.zoom.on('zoom', this.rescale))
                .on('dblclick.zoom', null)
            .append('g')
                .on('mousedown', this.mouseDown)
                .on('contextmenu', this.contextMenu);
                        
        this.visBox
            .append('rect')
                .attr('width', this.width * 2)
                .attr('height', this.height * 2)
                .attr('transform', 'translate(' + [-this.width/2, -this.height/2] + ')')
                .attr('fill', 'white');
                
        
        // init force layout
        this.forceLayout = d3.layout.force()
            .size([this.width, this.height])
            .nodes(this.nodesData)
            .links(this.linksData)
            .linkDistance(this.linkDistance)
            .charge(this.charge)
            .on('tick', this.tick);
        
        this.node = this.visBox.selectAll('.node');
        this.link = this.visBox.selectAll('.link');
                
        // add keyboard callback
        this.enableKeyUpDownHandler();
    }
            
    // rescale g
    this.rescale = function() {
        Constructor.visBox.attr('transform', 'translate(' + d3.event.translate + ')' + ' scale(' + d3.event.scale + ')');
    }
    
    this.setMouseDragHandler = function(handler) {
        Constructor.visBox
            .on('mousemove', handler);
    }
    this.enableKeyUpDownHandler = function() {
        d3.select(window)
            .on('keydown', Constructor.keyDown)
            .on('keyup', Constructor.keyUp);
    }
    this.enableZoom = function() {
        Constructor.zoom
            .translate(Constructor.eventVars.savedZoomValues.translate)
            .scale(Constructor.eventVars.savedZoomValues.scale);
            
        Constructor.outerSvg.select('g')
            .call(Constructor.zoom.on('zoom', Constructor.rescale))
            .on('dblclick.zoom', null);
        
        d3.event.translate = clone(Constructor.zoom.translate());
        d3.event.scale = Constructor.zoom.scale();
    }
    this.disableZoom = function() {
        Constructor.eventVars.savedZoomValues = {
            translate: clone(Constructor.zoom.translate()),
            scale: clone(Constructor.zoom.scale())
        };
        Constructor.outerSvg.select('g').call(Constructor.zoom.on('zoom', null));
    }

    // redraw force layout
    this.redraw = function() {
        // links
        this.link = this.link.data(this.linksData);            
            
        // add links
        this.link.enter().insert('line', '.node')
            .attr('class', 'link');
            // event handlers
            // drag links
            
        // remove links
        this.link.exit()
            .remove();
            
        this.link.classed('link_selected', function(d) { return Constructor.eventVars.selectedLinks.indexOf(d) >= 0; });
            
        // nodes
        this.node = this.node.data(this.nodesData);
        this.node.enter().insert('circle')
            .attr('class', 'node')
            .on('mousedown', this.mouseDownOnNode)
            .on('mouseenter', this.mouseEnterNode)
            .on('mouseleave', this.mouseLeaveNode)
            .call(d3.behavior.drag().on('drag', this.dragNode))
            .call(Constructor.forceLayout.drag)
            .attr('r', this.radius / 2)
            .transition()
            .duration(750)
            .ease('elastic')
            .attr('r', this.radius);
            
        this.node.exit()
            .transition()
            .attr('r', 0)
            .remove();
                        
        this.node.classed('node_selected', function(d) { return Constructor.eventVars.selectedNodes.indexOf(d) >= 0; });
        
        if (d3.event) {
            // prevent browser's default behavior
            d3.event.preventDefault();
        }

        this.forceLayout.start();
    }
    
    this.mouseDownOnNode = function(d) {
        if (d3.event.button == 0) {
            // left button
            if (d3.event.ctrlKey) {
                // + ctrl : additive select/deselect
                var selectedNodes = Constructor.eventVars.selectedNodes;
                var ind = selectedNodes.indexOf(d)
                if (ind >= 0)
                    selectedNodes.splice(ind, 1);
                else
                    selectedNodes.push(d);         
            }
            else if (d3.event.shiftKey) {
                // + shift : link this node with every selected node
                Constructor.linkToNode(d);

                Constructor.resetSelection();
                Constructor.eventVars.selectedNodes = [d];
            }
            else {
                // + no modifiers
                Constructor.resetSelection();
                Constructor.eventVars.selectedNodes = [d];
            }
            
            Constructor.eventVars.mouseDownNode = d;            
            Constructor.redraw();
        }
    }
    this.mouseDown = function() {
        if (d3.event.button == 0) {
            // left button
            if (d3.event.shiftKey) {
                // + shift: add node
                if (!Constructor.eventVars.mouseDownNode) {
                    var newNode = Constructor.addObject.call(this);
                    Constructor.linkToNode(newNode);
                    Constructor.resetSelection();
                }
            }
            else if (d3.event.ctrlKey) {
                if (!Constructor.eventVars.mouseDownNode) {
                    var point = d3.mouse(this);
                    Constructor.visBox
                        .append('rect')
                            .attr('class', 'rect_selection')
                            .attr('x', point[0])
                            .attr('y', point[1]);
                            
                    Constructor.eventVars.selectionRectangleCoordinates = clone(point);
                    Constructor.setMouseDragHandler(Constructor.mouseDrag);
                }
            }
            else {            
                if (!Constructor.eventVars.mouseDownNode && Constructor.eventVars.selectedNodes.length > 0) {
                    Constructor.resetSelection();
                }
            }
        }
        
        if (Constructor.eventVars.mouseDownNode || d3.event.ctrlKey) {
            Constructor.disableZoom();
        }
        
        if (d3.event.button == 2) {
            // context menu
            Constructor.disableZoom();
        }
        
        Constructor.redraw();
    }
    this.mouseDrag = function() {
        var point = d3.mouse(this);
        Constructor.visBox.select('.rect_selection')
            .attr('x', Math.min(point[0], Constructor.eventVars.selectionRectangleCoordinates[0]))
            .attr('y', Math.min(point[1], Constructor.eventVars.selectionRectangleCoordinates[1]))
            .attr('width',  Math.abs(point[0] - Constructor.eventVars.selectionRectangleCoordinates[0]))
            .attr('height',  Math.abs(point[1] - Constructor.eventVars.selectionRectangleCoordinates[1]));
    }
    this.mouseUp = function() {        
        if (Constructor.eventVars.mouseDownNode) {
            Constructor.eventVars.mouseDownNode = null;
            Constructor.enableZoom();
        }
        else {
            if (Constructor.eventVars.selectionRectangleCoordinates) {
                Constructor.selectAreaOfNodes();
                Constructor.removeSelectionRectangle();
                Constructor.eventVars.selectionRectangleCoordinates = null;
                Constructor.enableZoom();
                Constructor.redraw();
            }
        }
    }
    this.mouseEnterNode = function() {
        d3.select(this)
            .attr('r', Constructor.radius * 1.3);
    }
    this.mouseLeaveNode = function() {
        d3.select(this)
            .attr('r', Constructor.radius);
    }
    this.contextMenu = function() {
        Constructor.enableZoom();
    }
    this.setNewNodeType = function(newNodeType) {
        Constructor.eventVars.currentNewNodeType = newNodeType;
    }

    this.dragNode = function(d) {
        d.x = d3.event.x;
        d.y = d3.event.y;
        
        d3.select(this)
            .attr('cx', d.x)
            .attr('cy', d.y);
    }
    
    this.keyUp = function() {
//        log("%d", d3.event.keyCode);
        switch (d3.event.keyCode) {
            case 17: { // ctrl
                Constructor.removeSelectionRectangle();
                break;
            }
        }
    }
    this.keyDown = function() {
//        log("%d", d3.event.keyCode);
    }

    this.tick = function() {
        Constructor.link
            .attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });

        Constructor.node
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; });
    }
    this.selectAreaOfNodes = function() {
        var svgRect = Constructor.visBox.select('.rect_selection'),
            rect = { 
                x1: +svgRect.attr('x'), x2 : (+svgRect.attr('x') + (+svgRect.attr('width'))),
                y1: +svgRect.attr('y'), y2 : (+svgRect.attr('y') + (+svgRect.attr('height')))
            };
            
        
        Constructor.eventVars.selectedNodes = Constructor.nodesData
            .filter(function(d) { 
                return d.x >= rect.x1 && d.x <= rect.x2 && d.y >= rect.y1 && d.y <= rect.y2; 
            });
    }
    this.createSelectionRectangle = function(point) {
        Constructor.visBox
            .append('rect')
                .attr('class', 'rect_selection')
                .attr('x', point[0])
                .attr('y', point[1]);
                
        Constructor.eventVars.selectionRectangleCoordinates = clone(point);
        Constructor.setMouseDragHandler(Constructor.mouseDrag);
    }
    this.removeSelectionRectangle = function() {
        if (Constructor.eventVars.selectionRectangleCoordinates) {        
            Constructor.setMouseDragHandler(null);
            Constructor.visBox.selectAll('.rect_selection')
                .remove();
        }
    }
    this.resetSelection = function() {
        Constructor.eventVars.selectedNodes = [];
        Constructor.eventVars.selectedLinks = [];        
    }
    this.addObject = function() {
        var newObject;
        switch (Constructor.eventVars.currentNewNodeType) {
            case 'host':
                newObject = new Host(Environment.getNextUniqueMac());
                break;
            case 'router':
                newObject = new Router(Environment.getNextUniqueMac());
                break;
            case 'switch':
                newObject = new Switch(Environment.getNextUniqueSwitchNumber());
                break;
            default:
                log("unknown 'new node type'");
                break;
        }
        
        var point = d3.mouse(this),
            newNode = {x: point[0], y: point[1], obj: newObject};
            
        Environment.addObject(newObject);
        Constructor.nodesData.push(newNode);
        return newNode;
    }
    this.linkToNode = function(node) {
        Constructor.eventVars.selectedNodes.forEach(function(d) {
            var port1 = d.obj.addPort(Environment.getNextUniqueMac());
            var port2 = node.obj.addPort(Environment.getNextUniqueMac());
            var tm = Environment.addObject(new TransMedium());
            Environment.connectPorts(port1, port2, tm);
            
            Constructor.linksData.push({source: d, target: node});
        });
    }
    
//    // line displayed when dragging new nodes
//    var drag_line = vis.append('line')
//        .attr('class', 'drag_line')
//        .attr('x1', 0)
//        .attr('y1', 0)
//        .attr('x2', 0)
//        .attr('y2', 0);

//    // get layout properties
//    var nodes = force.nodes(),
//        links = force.links(),
//        node = vis.selectAll('.node'),
//        link = vis.selectAll('.link');

//    redraw();

//    // focus on svg
//    // vis.node().focus();

//    function mousemove() {
//      if (!mousedown_node) return;

//      // update drag line
//      drag_line
//          .attr('x1', mousedown_node.x)
//          .attr('y1', mousedown_node.y)
//          .attr('x2', d3.svg.mouse(this)[0])
//          .attr('y2', d3.svg.mouse(this)[1]);

//    }

//    function mouseup() {
//      if (mousedown_node) {
//        // hide drag line
//        drag_line
//          .attr('class', 'drag_line_hidden')

//        if (!mouseup_node) {
//          // add node
//          var point = d3.mouse(this),
//            node = {x: point[0], y: point[1]},
//            n = nodes.push(node);

//          // select new node
//          selected_node = node;
//          selected_link = null;
//          
//          // add link to mousedown node
//          links.push({source: mousedown_node, target: node});
//        }

//        redraw();
//      }
//      // clear mouse event vars
//      resetMouseVars();
//    }

//    function resetMouseVars() {
//      mousedown_node = null;
//      mouseup_node = null;
//      mousedown_link = null;
//    }

//    // redraw force layout
//    function redraw() {

//      link = link.data(links);

//      link.enter().insert('line', '.node')
//          .attr('class', 'link')
//          .on('mousedown', 
//            function(d) { 
//              mousedown_link = d; 
//              if (mousedown_link == selected_link) selected_link = null;
//              else selected_link = mousedown_link; 
//              selected_node = null; 
//              redraw(); 
//            })

//      link.exit().remove();

//      link
//        .classed('link_selected', function(d) { return d === selected_link; });

//      node = node.data(nodes);

//      node.enter().insert('circle')
//          .attr('class', 'node')
//          .attr('r', 5)
//          .on('mousedown', 
//            function(d) { 
//              // disable zoom
//              vis.call(d3.behavior.zoom().on('zoom'), null);

//              mousedown_node = d;
//              if (mousedown_node == selected_node) selected_node = null;
//              else selected_node = mousedown_node; 
//              selected_link = null; 

//              // reposition drag line
//              drag_line
//                  .attr('class', 'link')
//                  .attr('x1', mousedown_node.x)
//                  .attr('y1', mousedown_node.y)
//                  .attr('x2', mousedown_node.x)
//                  .attr('y2', mousedown_node.y);

//              redraw(); 
//            })
//          .on('mousedrag',
//            function(d) {
//              // redraw();
//            })
//          .on('mouseup', 
//            function(d) { 
//              if (mousedown_node) {
//                mouseup_node = d; 
//                if (mouseup_node == mousedown_node) { resetMouseVars(); return; }

//                // add link
//                var link = {source: mousedown_node, target: mouseup_node};
//                links.push(link);

//                // select new link
//                selected_link = link;
//                selected_node = null;

//                // enable zoom
//                vis.call(d3.behavior.zoom().on('zoom'), rescale);
//                redraw();
//              } 
//            })
//        .transition()
//          .duration(750)
//          .ease('elastic')
//          .attr('r', 6.5);

//      node.exit().transition()
//          .attr('r', 0)
//        .remove();

//      node
//        .classed('node_selected', function(d) { return d === selected_node; });

//      

//      if (d3.event) {
//        // prevent browser's default behavior
//        d3.event.preventDefault();
//      }

//      force.start();

//    }

//    function spliceLinksForNode(node) {
//      toSplice = links.filter(
//        function(l) { 
//          return (l.source === node) || (l.target === node); });
//      toSplice.map(
//        function(l) {
//          links.splice(links.indexOf(l), 1); });
//    }

//    function keydown() {
//      if (!selected_node && !selected_link) return;
//      switch (d3.event.keyCode) {
//        case 8: // backspace
//        case 46: { // delete
//          if (selected_node) {
//            nodes.splice(nodes.indexOf(selected_node), 1);
//            spliceLinksForNode(selected_node);
//          }
//          else if (selected_link) {
//            links.splice(links.indexOf(selected_link), 1);
//          }
//          selected_link = null;
//          selected_node = null;
//          redraw();
//          break;
//        }
//      }
//    }
}

