var NetTopologyEditor = new function() {
        
    this.removeNode = function(node) {
        var i = Visualizer.nodesData.indexOf(node);
        if (i >= 0) {
            Visualizer.nodesData.splice(i, 1);            
            for (i = 0; i < Visualizer.linksData.length; i++) {
                var d = Visualizer.linksData[i];
                if (d.source == node || d.target == node) {
                    Visualizer.linksData.splice(i, 1);
                    i--;
                }
            }
            
            Environment.removeObject(node.obj);
        }
    }
    this.linkToNode = function(node, nodes) {
        nodes.forEach(function(d) {
            var port1 = d.obj.addPort(Environment.getNextUniqueMac());
            var port2 = node.obj.addPort(Environment.getNextUniqueMac());
            var tm = Environment.addObject(new TransMedium());
            Environment.connectPorts(port1, port2, tm);
            
            Visualizer.linksData.push({source: d, target: node, tm: tm});
        });
    }
    this.removeLink = function(link) {
        var i = Visualizer.linksData.indexOf(link);
        Visualizer.linksData.splice(i, 1);
        Environment.removeObject(link.tm);
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

