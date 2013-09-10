var VisLabels = new function() {    
    this.forceLayout;
    this.linkStrength = 8;
    this.charge = -100;

    this.label;
    this.nodesData = [];
    this.linksData = [];
    this.labelsData = [];
    
    this.svgContainer;
    this.gVisibleContainer;
    
    this.initialize = function() {         
        this.svgContainer = Visualizer.svgContainer;
        this.gVisibleContainer = Visualizer.gVisibleContainer;
        
        this.label = this.gVisibleContainer.selectAll('.label');
        
        // init force layout
        this.forceLayout = d3.layout.force()
            .size([this.width, this.height])
            .nodes(this.nodesData)
            .links(this.linksData)
            .gravity(0)
            .linkDistance(15)
            .linkStrength(this.linkStrength)
            .charge(this.charge)
            .on('tick', this.hForceLayoutTick);
    }
    // redraw graph    
    this.redraw = function() {
        // nodes
        this.label = this.label.data(this.labelsData, function(d) { return VisLabels.labelsData.indexOf(d); });
        this.label.enter().append('text')
            .attr('class', 'label')
            .transition()
            .duration(750)
            .text(function(d) { return d.obj.getObjectName(); });
                       
        this.label.exit().remove();
                        
        this.label
            .attr('font-weight', function(d) { return (Visualizer.selectedNodes.indexOf(d.node.node) >= 0) ? 'bold' : null; });
        
        this.forceLayout.start();
    }
    this.hForceLayoutTick = function() {
        for (var i = 0; i < VisLabels.nodesData.length; i++ ) {            
            if (i % 2 == 0) {
                var d = VisLabels.nodesData[i];
                d.x = d.node.x;
                d.y = d.node.y;
            }
        }
        
        VisLabels.label
            .attr('x', function(d) {
			        var b = this.getBBox();
			        var d = d.node;

			        var diffX = d.x - d.node.x;
			        var diffY = d.y - d.node.y;
			        var dist = Math.sqrt(diffX * diffX + diffY * diffY);

			        var shiftX = b.width * (diffX - dist) / (dist * 2);
			        shiftX = Math.max(-b.width, Math.min(0, shiftX));
			        return d.x + shiftX;
		        }
	        )
		    .attr('y', function(d, i) { return d.node.y + 5; });
    }
    
    this.addNode = function(node) {
        var x = { node: node, x: node.x, y: node.y };
        var y = { node: node, x: node.x, y: node.y };
        this.nodesData.push(x);
        this.nodesData.push(y);
        this.linksData.push({ 
            source: x, 
            target: y,
            weight: 1
        });
        this.labelsData.push({ node: y, obj: y.node.obj });
    }
    this.removeNode = function(node, i) {
        this.nodesData.splice(i * 2, 2);
        this.linksData.splice(i, 1);
        this.labelsData.splice(i, 1);
    }
}
