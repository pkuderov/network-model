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
        mouseUpNode: null
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
        this.outerSvg = d3.select(".fb_chart")
            .append("svg:svg")
                .attr("width", this.width)
                .attr("height", this.height)
                .attr("pointer-events", "all");

        this.visBox = this.outerSvg
            .append('svg:g')
                .call(d3.behavior.zoom().on("zoom", this.rescale))
                .on("dblclick.zoom", null)
            .append('svg:g')
                .on("mousemove", this.mouseMove)
                .on("mousedown", this.mouseDown)
                .on("mouseup", this.mouseUp)
                .on("contextmenu", this.contextMenu);
                        
        this.visBox
            .append('svg:rect')
                .attr('width', this.width)
                .attr('height', this.height)
                .attr('fill', 'white');
                
        
        // init force layout
        this.forceLayout = d3.layout.force()
            .size([this.width, this.height])
            .nodes(this.nodesData)
            .linkDistance(this.linkDistance)
            .charge(this.charge)
            .on("tick", this.tick);
        
        this.node = this.visBox.selectAll(".node");
                
        // add keyboard callback
        d3.select(window)
            .on("keydown", this.keyDown);
    }
            
    // rescale g
    this.rescale = function() {
        Constructor.visBox.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }
    
    this.enableZoom = function() {
        Constructor.outerSvg.select("g")
            .call(d3.behavior.zoom().on("zoom", Constructor.rescale))
            .on("dblclick.zoom", null);
    }
    this.disableZoom = function() {
        Constructor.outerSvg.select("g").call(d3.behavior.zoom().on("zoom", null));        
    }

    // redraw force layout
    this.redraw = function() {
        this.node = this.node.data(this.nodesData);

        this.node.enter().insert("circle")
            .attr("class", "node")
            .on("mousedown", this.mouseDownOnNode)
            .on("mouseup", this.mouseUpOnNode)
            .on("mouseenter", this.mouseEnterNode)
            .on("mouseleave", this.mouseLeaveNode)
            .call(d3.behavior.drag().on("drag", this.dragNode))
            .call(Constructor.forceLayout.drag)
            .attr("r", this.radius / 2)
            .transition()
            .duration(750)
            .ease("elastic")
            .attr("r", this.radius);
            
        this.node.exit().transition()
            .attr("r", 0)
            .remove();
            
        this.node.classed("node_selected", function(d) { return Constructor.eventVars.selectedNodes.indexOf(d) >= 0; });
        
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
                // + ctrl
                var selectedNodes = Constructor.eventVars.selectedNodes;
                var ind = selectedNodes.indexOf(d)
                if (ind >= 0)
                    selectedNodes.splice(ind, 1);
                else
                    selectedNodes.push(d);                
            }
            else {
                // + no modifiers
                Constructor.eventVars.selectedNodes = [d];
            }
            Constructor.eventVars.mouseDownNode = d;
            
            Constructor.redraw();
        }
    }
    this.mouseUpOnNode = function(d) {
        //Constructor.redraw();
    }
    this.mouseEnterNode = function() {
        d3.select(this)
            .attr("r", Constructor.radius * 1.3);
    }
    this.mouseLeaveNode = function() {
        d3.select(this)
            .attr("r", Constructor.radius);
    }

    this.mouseDown = function() {
        if (Constructor.eventVars.mouseDownNode) {
            Constructor.disableZoom();
        }
        else {
            if (Constructor.eventVars.selectedNodes.length > 0)
                Constructor.eventVars.selectedNodes = [];
            Constructor.redraw();
        }
        
        if (d3.event.button == 2) {
            Constructor.disableZoom();
        }
    }
    this.contextMenu = function() {
        Constructor.enableZoom();
    }

    this.mouseUp = function() {
        if (Constructor.eventVars.mouseDownNode) {
            Constructor.eventVars.mouseDownNode = null;
            Constructor.enableZoom();
        }
        
        if (d3.event.button == 0 && d3.event.shiftKey) {
            // left button + shft key
            var point = d3.mouse(this),
                newHost = new Host(Environment.getNextUniqueMac());
                
            Environment.addObject(newHost);
            Constructor.nodesData.push({x: point[0], y: point[1], obj: newHost});
    
            Constructor.redraw();
        }
        
        if (d3.event.button == 2) {
            log("right button");
        }
    }
    
    this.dragNode = function(d) {
        d.x = d3.event.x;
        d.y = d3.event.y;
        
        d3.select(this)
            .attr("cx", d.x)
            .attr("cy", d.y);
    }

    this.tick = function() {
//        this.link.attr("x1", function(d) { return d.source.x; })
//            .attr("y1", function(d) { return d.source.y; })
//            .attr("x2", function(d) { return d.target.x; })
//            .attr("y2", function(d) { return d.target.y; });

        Constructor.node
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
            
//        Constructor.node.select("text")
//            .attr("x", function(d) { return d.x; })
//            .attr("y", function(d) { return d.y; });
    }
    
    
//    // line displayed when dragging new nodes
//    var drag_line = vis.append("line")
//        .attr("class", "drag_line")
//        .attr("x1", 0)
//        .attr("y1", 0)
//        .attr("x2", 0)
//        .attr("y2", 0);

//    // get layout properties
//    var nodes = force.nodes(),
//        links = force.links(),
//        node = vis.selectAll(".node"),
//        link = vis.selectAll(".link");

//    redraw();

//    // focus on svg
//    // vis.node().focus();

//    function mousemove() {
//      if (!mousedown_node) return;

//      // update drag line
//      drag_line
//          .attr("x1", mousedown_node.x)
//          .attr("y1", mousedown_node.y)
//          .attr("x2", d3.svg.mouse(this)[0])
//          .attr("y2", d3.svg.mouse(this)[1]);

//    }

//    function mouseup() {
//      if (mousedown_node) {
//        // hide drag line
//        drag_line
//          .attr("class", "drag_line_hidden")

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

//      link.enter().insert("line", ".node")
//          .attr("class", "link")
//          .on("mousedown", 
//            function(d) { 
//              mousedown_link = d; 
//              if (mousedown_link == selected_link) selected_link = null;
//              else selected_link = mousedown_link; 
//              selected_node = null; 
//              redraw(); 
//            })

//      link.exit().remove();

//      link
//        .classed("link_selected", function(d) { return d === selected_link; });

//      node = node.data(nodes);

//      node.enter().insert("circle")
//          .attr("class", "node")
//          .attr("r", 5)
//          .on("mousedown", 
//            function(d) { 
//              // disable zoom
//              vis.call(d3.behavior.zoom().on("zoom"), null);

//              mousedown_node = d;
//              if (mousedown_node == selected_node) selected_node = null;
//              else selected_node = mousedown_node; 
//              selected_link = null; 

//              // reposition drag line
//              drag_line
//                  .attr("class", "link")
//                  .attr("x1", mousedown_node.x)
//                  .attr("y1", mousedown_node.y)
//                  .attr("x2", mousedown_node.x)
//                  .attr("y2", mousedown_node.y);

//              redraw(); 
//            })
//          .on("mousedrag",
//            function(d) {
//              // redraw();
//            })
//          .on("mouseup", 
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
//                vis.call(d3.behavior.zoom().on("zoom"), rescale);
//                redraw();
//              } 
//            })
//        .transition()
//          .duration(750)
//          .ease("elastic")
//          .attr("r", 6.5);

//      node.exit().transition()
//          .attr("r", 0)
//        .remove();

//      node
//        .classed("node_selected", function(d) { return d === selected_node; });

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

