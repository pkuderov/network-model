var Visualizer = new function() {
    this.forceLayout;
    this.linkDistance = 50;
    this.charge = -200;
    this.height = 720;
    this.width = 720;
    this.radius = 10;
    this.gScale = 3;
    this.strokeWidth = 3;
    this.svgContainer;
    this.gVisibleContainer;
    this.fbDetail;
    this.node;
    this.link;
    this.nodesData = [];
    this.linksData = [];
    this.zoom;
    this.drag;
    this.selectedNodes = [];
    this.selectedLinks = [];
    this.mouseDownLink = null;
    this.mouseDownNode = null;
    this.selectionRectangle = null;
    this.savedZoom = {};
    this.newNodeType = "host";
    this.editMode = false;
    this.initialize = function() {
        this.zoom = d3.behavior.zoom();
        this.drag = d3.behavior.drag();
        this.fbDetail = d3.select(".fbDetail");
        this.svgContainer = d3.select(".fbChart").append("svg:svg").attr("width", this.width).attr("height", this.height).attr("pointer-events", "all");
        this.gVisibleContainer = this.svgContainer.append("g").call(this.zoom.on("zoom", this.hRescale)).on("dblclick.zoom", null).append("g").on("mousedown", this.hMouseDown);
        this.gVisibleContainer.append("rect").attr("width", this.width * this.gScale).attr("height", this.height * this.gScale).attr("transform", "translate(" + [ (1 - this.gScale) * this.width / 2, (1 - this.gScale) * this.height / 2 ] + ")").attr("fill", "white").attr("stroke", "grey").attr("stroke-width", 1);
        this.node = this.gVisibleContainer.selectAll(".node");
        this.link = this.gVisibleContainer.selectAll(".link");
        this.forceLayout = d3.layout.force().size([ this.width, this.height ]).nodes(this.nodesData).links(this.linksData).linkDistance(this.linkDistance).charge(this.charge).on("tick", this.hForceLayoutTick);
        VisLabels.initialize();
        d3.select(window).on("keyup", this.hKeyUp).on("mouseup", this.hMouseUp);
        this.setEditMode(true);
        this.redrawGraph();
    };
    this.setEditMode = function(isEdit) {
        if (isEdit) {
            var buttons = [ {
                text: "host",
                onClick: "Visualizer.setNewNodeType('host')",
                "class": "new-node-type"
            }, {
                text: "router",
                onClick: "Visualizer.setNewNodeType('router')",
                "class": "new-node-type"
            }, {
                text: "switch",
                onClick: "Visualizer.setNewNodeType('switch')",
                "class": "new-node-type"
            }, {
                text: "freeze",
                onClick: "Visualizer.setEditMode(false)",
                id: "btnEditMode"
            } ];
            Executor.pause();
        } else {
            var buttons = [ {
                text: "play",
                onClick: "Visualizer.switchState()",
                id: "btnSwitchState"
            }, {
                text: "step",
                onClick: "Visualizer.stepForward()"
            }, {
                placeholder: "tick rate",
                type: "text",
                id: "executorRate"
            }, {
                text: "set rate",
                onClick: "Visualizer.setExecutorRate()"
            }, {
                text: "edit",
                onClick: "Visualizer.setEditMode(true)",
                id: "btnEditMode"
            } ];
        }
        d3.select(".fbManage").selectAll("input").remove();
        d3.select(".fbManage").selectAll("input").data(buttons).enter().insert("input").attr("type", function(d) {
            return d.type ? d.type : "button";
        }).attr("value", function(d) {
            return d.text;
        }).attr("id", function(d) {
            return d.id;
        }).attr("placeholder", function(d) {
            return d.placeholder;
        }).attr("onClick", function(d) {
            return d.onClick;
        });
        d3.select(".fbManage").select("#executorRate").style("width", 50).attr("value", Executor.pauseBetweenTicksInMs);
        this.editMode = isEdit;
        this.redrawDetails();
    };
    this.redrawGraph = function() {
        this.link = this.link.data(this.linksData, function(d) {
            return Visualizer.linksData.indexOf(d);
        });
        this.link.enter().insert("line", ".node").attr("class", "link").on("mouseenter", this.hMouseEnterLink).on("mouseleave", this.hMouseLeaveLink).on("mousedown", this.hMouseDownOnLink).attr("stroke-width", this.strokeWidth);
        this.link.exit().remove();
        this.node = this.node.data(this.nodesData, function(d) {
            return Visualizer.nodesData.indexOf(d);
        });
        this.node.enter().insert("circle", ".label").attr("class", function(d) {
            return d.obj.objectTypeName + " node";
        }).on("mouseenter", this.hMouseEnterNode).on("mouseleave", this.hMouseLeaveNode).on("mousedown", this.hMouseDownOnNode).call(this.drag.on("drag", this.hDragNode)).call(this.forceLayout.drag).attr("r", this.radius / 2).transition().duration(750).ease("elastic").attr("r", this.radius);
        this.node.exit().transition().duration(500).attr("r", 0).remove();
        VisLabels.redrawGraphLabels();
        if (d3.event) {
            d3.event.preventDefault();
        }
        this.forceLayout.start();
    };
    this.redrawOnSelectionChanged = function() {
        this.link.classed("selected", function(d) {
            return Visualizer.selectedLinks.indexOf(d) >= 0;
        });
        this.node.classed("selected", function(d) {
            return Visualizer.selectedNodes.indexOf(d) >= 0;
        });
        VisLabels.redrawOnSelectionChanged();
        this.redrawDetails();
    };
    this.redrawDetails = function() {
        VisInfo.showDetails(this.editMode, this.selectedNodes, this.selectedLinks);
    };
    this.redrawMessages = function() {
        var messages = [];
        for (var i = 0; i < this.linksData.length; i++) {
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
        this.gVisibleContainer.selectAll(".message").remove();
        if (messages.length == 0) return;
        this.gVisibleContainer.selectAll(".message").data(messages).enter().insert("circle").attr("class", "message").attr("r", 3).attr("fill", "red").each(function(d) {
            var dx = d.target.x - d.source.x;
            var dy = d.target.y - d.source.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            d.p = ((dist - 2 * r) * d.percent + r) / dist;
        }).attr("cx", function(d) {
            return d.source.x + d.p * (d.target.x - d.source.x);
        }).attr("cy", function(d) {
            return d.source.y + d.p * (d.target.y - d.source.y);
        });
    };
    this.test = function() {
        var point = [ 0, 0 ];
        for (var i = 0; i < 7; i++) {
            this.selectedNodes.push(this.addNode(point));
        }
        this.setNewNodeType("switch");
        var last = this.addNode(point);
        this.linkNodeToSelectedNodes(last);
        this.setSelection([ last ]);
    };
    this.test2 = function() {
        var point = [ 0, 0 ];
        var x = this.addNode(point);
        this.setSelection([ x ]);
        var y = this.addNode(point);
        this.linkNodeToSelectedNodes(y);
        x.obj.netIfaces[1].addIp(ipStringToInt("192.168.55.212"), netmaskShortToFull(28));
        y.obj.netIfaces[1].addIp(ipStringToInt("192.168.55.211"), netmaskShortToFull(28));
        x.obj.protocolHandlers.UDP.send(ipStringToInt("192.168.55.212"), 8080, ipStringToInt("192.168.55.211"), 8090, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    };
    this.hRescale = function() {
        Visualizer.gVisibleContainer.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    };
    this.hMouseDown = function() {
        if (d3.event.button == 0) {
            if (d3.event.shiftKey) {
                Visualizer.linkNodeToSelectedNodes(Visualizer.addNode(d3.mouse(this)));
                Visualizer.setSelection();
            } else if (d3.event.ctrlKey) {
                Visualizer.createSelectionRectangle(d3.mouse(this));
                Visualizer.disableZoom();
            } else {
                Visualizer.setSelection();
            }
        }
    };
    this.hMouseDrag = function() {
        var point = d3.mouse(Visualizer.gVisibleContainer.node());
        Visualizer.gVisibleContainer.select(".rectSelection").attr("x", Math.min(point[0], Visualizer.selectionRectangle[0])).attr("y", Math.min(point[1], Visualizer.selectionRectangle[1])).attr("width", Math.abs(point[0] - Visualizer.selectionRectangle[0])).attr("height", Math.abs(point[1] - Visualizer.selectionRectangle[1]));
    };
    this.hMouseUp = function() {
        if (Visualizer.mouseDownNode || Visualizer.mouseDownLink) {
            Visualizer.mouseDownNode = null;
            Visualizer.mouseDownLink = null;
            Visualizer.enableZoom();
        } else if (Visualizer.selectionRectangle) {
            Visualizer.selectAreaOfNodes();
            Visualizer.removeSelectionRectangle();
            Visualizer.enableZoom();
        }
    };
    this.hMouseDownOnLink = function(d) {
        if (d3.event.button == 0) {
            if (d3.event.ctrlKey) {
                Visualizer.xorAddToSelection(null, [ d ]);
            } else {
                Visualizer.setSelection(null, [ d ]);
            }
            Visualizer.mouseDownLink = d;
            Visualizer.disableZoom();
        }
        d3.event.stopPropagation();
    };
    this.hMouseDownOnNode = function(d) {
        if (d3.event.button == 0) {
            if (d3.event.ctrlKey) {
                Visualizer.xorAddToSelection([ d ]);
            } else if (d3.event.shiftKey) {
                Visualizer.linkNodeToSelectedNodes(d);
                Visualizer.setSelection([ d ]);
            } else {
                Visualizer.setSelection([ d ], null);
            }
            Visualizer.mouseDownNode = d;
            Visualizer.disableZoom();
        }
        d3.event.stopPropagation();
    };
    this.hKeyUp = function() {
        var target = d3.event.target;
        if (target == null) target = d3.event.srcElement;
        if (target != null && target.type == "text") return;
        switch (d3.event.keyCode) {
          case 17:
            {
                Visualizer.removeSelectionRectangle();
                break;
            }

          case 82:
            {
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
    };
    this.hMouseEnterNode = function() {
        d3.select(this).attr("r", Visualizer.radius * 1.3);
    };
    this.hMouseLeaveNode = function() {
        d3.select(this).attr("r", Visualizer.radius);
    };
    this.hMouseEnterLink = function() {
        d3.select(this).attr("stroke-width", Visualizer.strokeWidth * 2);
    };
    this.hMouseLeaveLink = function() {
        d3.select(this).attr("stroke-width", Visualizer.strokeWidth);
    };
    this.hDragNode = function(d) {
        d.x = d3.event.x;
        d.y = d3.event.y;
        d3.select(this).attr("cx", d.x).attr("cy", d.y);
    };
    this.hForceLayoutTick = function() {
        VisLabels.forceLayout.start();
        Visualizer.link.attr("x1", function(d) {
            return d.source.x;
        }).attr("y1", function(d) {
            return d.source.y;
        }).attr("x2", function(d) {
            return d.target.x;
        }).attr("y2", function(d) {
            return d.target.y;
        });
        Visualizer.node.attr("cx", function(d) {
            return d.x;
        }).attr("cy", function(d) {
            return d.y;
        });
    };
    this.enableZoom = function() {
        if (this.savedZoom.translate == null) return;
        this.zoom.translate(this.savedZoom.translate).scale(this.savedZoom.scale);
        this.svgContainer.select("g").call(this.zoom.on("zoom", this.hRescale)).on("dblclick.zoom", null);
        d3.event.translate = clone(this.zoom.translate());
        d3.event.scale = clone(this.zoom.scale());
    };
    this.disableZoom = function() {
        this.savedZoom = {
            translate: clone(this.zoom.translate()),
            scale: clone(this.zoom.scale())
        };
        this.svgContainer.select("g").call(this.zoom.on("zoom", null));
    };
    this.selectAreaOfNodes = function() {
        var svgRect = this.gVisibleContainer.select(".rectSelection"), r = this.radius, rect = {
            x1: +svgRect.attr("x") - r,
            x2: +svgRect.attr("x") + +svgRect.attr("width") + r,
            y1: +svgRect.attr("y") - r,
            y2: +svgRect.attr("y") + +svgRect.attr("height") + r
        };
        var toSelect = this.nodesData.filter(function(d) {
            return d.x >= rect.x1 && d.x <= rect.x2 && d.y >= rect.y1 && d.y <= rect.y2;
        });
        this.setSelection(toSelect, null);
    };
    this.createSelectionRectangle = function(point) {
        this.gVisibleContainer.append("rect").attr("class", "rectSelection").attr("x", point[0]).attr("y", point[1]);
        this.selectionRectangle = clone(point);
        d3.select(window).on("mousemove", this.hMouseDrag);
    };
    this.removeSelectionRectangle = function() {
        if (Visualizer.selectionRectangle) {
            d3.select(window).on("mousemove", null);
            Visualizer.gVisibleContainer.selectAll(".rectSelection").remove();
            Visualizer.selectionRectangle = null;
        }
    };
    this.setSelection = function(nodes, links) {
        this.selectedNodes = nodes ? nodes : [];
        this.selectedLinks = links ? links : [];
        this.redrawOnSelectionChanged();
    };
    this.xorAddToSelection = function(nodes, links) {
        if (nodes) {
            for (var i = 0; i < nodes.length; i++) {
                var node = nodes[i];
                var ind = this.selectedNodes.indexOf(node);
                if (ind >= 0) this.selectedNodes.splice(ind, 1); else this.selectedNodes.push(node);
            }
        }
        if (links) {
            for (var i = 0; i < links.length; i++) {
                var link = links[i];
                var i = this.selectedLinks.indexOf(link);
                if (i >= 0) this.selectedLinks.splice(i, 1); else this.selectedLinks.push(link);
            }
        }
        this.redrawOnSelectionChanged();
    };
    this.addNode = function(point) {
        var newObject = Environment.addObject(Environment.createObject(this.newNodeType)), newNode = {
            x: point[0],
            y: point[1],
            obj: newObject
        };
        this.nodesData.push(newNode);
        VisLabels.addNode(newNode);
        this.redrawGraph();
        return newNode;
    };
    this.linkNodeToSelectedNodes = function(node) {
        this.selectedNodes.forEach(function(d) {
            var tm = Environment.connectObjects(d.obj, node.obj);
            Visualizer.linksData.push({
                source: d,
                target: node,
                tm: tm
            });
        });
        this.redrawGraph();
    };
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
    };
    this.removeLink = function(link) {
        var i = this.linksData.indexOf(link);
        if (i >= 0) {
            this.linksData.splice(i, 1);
            Environment.removeObject(link.tm);
            this.redrawGraph();
        }
    };
    this.setNewNodeType = function(newNodeType) {
        this.newNodeType = newNodeType;
    };
    this.switchState = function() {
        var button = d3.select(".fbManage").select("#btnSwitchState");
        if (Executor.isPaused()) {
            button.property("value", "pause");
            Executor.play();
        } else {
            button.property("value", "play");
            Executor.pause();
        }
    };
    this.stepForward = function() {
        if (!Executor.isPaused()) this.switchState();
        Executor.stepForward();
    };
    this.setExecutorRate = function() {
        var input = d3.select(".fbManage").select("#executorRate");
        var rate = strToInt(input.property("value"));
        var valid = rate != null && rate > 5;
        VisInfo.setAndResetWithDelay(input, "border-color", !valid ? "red" : "lightgreen", null, 1e3);
        if (valid) Executor.pauseBetweenTicksInMs = rate;
    };
}();

var VisInfo = new function() {
    this.colorDisabled = "#DEDEDE";
    this.showDetails = function(editMode, nodes, links) {
        Visualizer.fbDetail.selectAll("*").remove();
        if (editMode) {
            if (nodes.length == 1) {
                var host = nodes[0].obj;
                if (host instanceof Router) {
                    IpInfo.showIpDetails(host);
                    RouteInfo.showRouteDetails(host);
                }
            } else if (nodes.length > 1) {
                var hosts = [];
                for (var i = 0; i < nodes.length; i++) {
                    hosts.push(nodes[i].obj);
                }
                SubnetInfo.showSubnetDetails(hosts);
            }
        } else {
            if (nodes.length >= 1 && nodes.length <= 2 && nodes[0].obj instanceof Host) {
                var fromHost = nodes[0].obj;
                var toHost = nodes.length >= 2 && nodes[1].obj instanceof Host ? nodes[1].obj : null;
                SendInfo.showSendDetails(fromHost, toHost);
            }
        }
    };
    this.appendDropDown = function(container, initialText, disabled) {
        var divWrapper = container.append("div").attr("class", "dropdown-wrapper");
        var pOutput = divWrapper.append("p").text(initialText).property("initialText", initialText);
        var ulList = divWrapper.append("ul").attr("class", "dropdown-list");
        var item = ulList.selectAll("li");
        this.setDisabledColor(pOutput, disabled);
        return {
            divWrapper: divWrapper,
            pOutput: pOutput,
            ulList: ulList,
            item: item
        };
    };
    this.selectDropdownItem = function(dropdown, selectedText) {
        dropdown.pOutput.text(selectedText);
        this.setAndResetWithDelay(dropdown.ulList, "display", "none", null, 100);
    };
    this.markLinkByColor = function(tm, color) {
        Visualizer.link.filter(function(d) {
            return d.tm == tm;
        }).style("stroke", color);
    };
    this.setDisabledColor = function(obj, disabled) {
        obj.style("color", disabled ? this.colorDisabled : null);
    };
    this.setAndResetWithDelay = function(obj, styleName, initialStyle, resultStyle, delay) {
        obj.style(styleName, initialStyle).transition().delay(delay).style(styleName, resultStyle);
    };
    this.getNetIfaceName = function(netIface) {
        return netIface instanceof LoopbackNetIface ? "loopback" : netIface.mac;
    };
}();

var IpInfo = new function() {
    this.showIpDetails = function(host) {
        this.ipFieldset = this.appendIpFieldset(Visualizer.fbDetail);
        var ddNetIface = this.ipFieldset.dropdownNetIfaces;
        ddNetIface.item = ddNetIface.item.data(host.netIfaces);
        ddNetIface.item.enter().append("li").on("mouseenter", this.hMouseEnterDropdownItem).on("mouseleave", this.hMouseLeaveDropdownItem).on("mouseup", this.hMouseUpOnNetIfaceItem).attr("class", "dropdown-item").text(VisInfo.getNetIfaceName);
    };
    this.appendIpFieldset = function(container) {
        var fieldset = container.append("fieldset");
        fieldset.append("legend").text("Ip addresses:");
        var dropdownNetIfaces = VisInfo.appendDropDown(fieldset, "Select net interface");
        var dropdownIpAddresses = VisInfo.appendDropDown(fieldset, "Select IP", true);
        var btnRemoveIp = fieldset.append("input").attr("type", "button").attr("value", "Remove IP").attr("disabled", "disabled");
        fieldset.append("p");
        var inputIpNetmask = fieldset.append("input").attr("type", "text").attr("placeholder", "X.X.X.X/netmask").attr("class", "input-text").style("width", 120);
        var btnAddIp = fieldset.append("input").attr("type", "button").attr("value", "Add IP").attr("disabled", "disabled");
        return {
            fieldset: fieldset,
            dropdownNetIfaces: dropdownNetIfaces,
            dropdownIpAddresses: dropdownIpAddresses,
            btnRemoveIp: btnRemoveIp,
            inputIpNetmask: inputIpNetmask,
            btnAddIp: btnAddIp
        };
    };
    this.loadIpList = function(netIface) {
        var ddIp = this.ipFieldset.dropdownIpAddresses;
        ddIp.item = ddIp.item.data(netIface.addresses);
        ddIp.item.enter().append("li").on("mouseup", this.hMouseUpOnIpAddressItem).attr("class", "dropdown-item").text(addressObjToString);
        ddIp.item.exit().remove();
        if (netIface.addresses.length == 0) VisInfo.setDisabledColor(ddIp.pOutput, VisInfo.colorDisabled); else VisInfo.setDisabledColor(ddIp.pOutput, null);
        ddIp.pOutput.text(ddIp.pOutput.node().initialText);
    };
    this.hMouseUpOnNetIfaceItem = function(netIface) {
        VisInfo.selectDropdownItem(IpInfo.ipFieldset.dropdownNetIfaces, VisInfo.getNetIfaceName(netIface));
        IpInfo.ipFieldset.btnAddIp.on("click", IpInfo.hAddIp).property("netIface", netIface).attr("disabled", null);
        IpInfo.ipFieldset.btnRemoveIp.property("netIface", netIface);
        IpInfo.loadIpList(netIface);
    };
    this.hMouseUpOnIpAddressItem = function(address) {
        VisInfo.selectDropdownItem(IpInfo.ipFieldset.dropdownIpAddresses, addressObjToString(address));
        IpInfo.ipFieldset.btnRemoveIp.on("click", IpInfo.hRemoveIp).property("address", address).attr("disabled", null);
    };
    this.hAddIp = function() {
        var input = IpInfo.ipFieldset.inputIpNetmask;
        var address = addressStringToObj(input.property("value"));
        VisInfo.setAndResetWithDelay(input, "border-color", address == null ? "red" : "lightgreen", null, 1e3);
        if (address != null) {
            this.netIface.addIp(address.ip, address.netmask);
            IpInfo.loadIpList(this.netIface);
        }
    };
    this.hRemoveIp = function() {
        this.netIface.removeIp(this.address.ip);
        IpInfo.loadIpList(this.netIface);
    };
    this.hMouseEnterDropdownItem = function(netIface) {
        if (netIface instanceof LoopbackNetIface) return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, "lightgreen");
    };
    this.hMouseLeaveDropdownItem = function(netIface) {
        if (netIface instanceof LoopbackNetIface) return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, null);
    };
}();

var RouteInfo = new function() {
    this.showRouteDetails = function(host) {
        this.host = host;
        this.routeFieldset = this.appendRouteFieldset(Visualizer.fbDetail, host);
        var ddNetIface = this.routeFieldset.dropdownNetIfaces;
        ddNetIface.item = ddNetIface.item.data(host.netIfaces);
        ddNetIface.item.enter().append("li").on("mouseenter", this.hMouseEnterDropdownItem).on("mouseleave", this.hMouseLeaveDropdownItem).on("mouseup", this.hMouseUpOnNetIfaceItem).attr("class", "dropdown-item").text(VisInfo.getNetIfaceName);
    };
    this.appendRouteFieldset = function(container, host) {
        var fieldset = container.append("fieldset");
        fieldset.append("legend").text("Routes:");
        var dropdownNetIfaces = VisInfo.appendDropDown(fieldset, "Select net interface");
        var dropdownRoutes = VisInfo.appendDropDown(fieldset, "Select route", true);
        var btnRemoveRoute = fieldset.append("input").attr("type", "button").attr("value", "Remove route").attr("disabled", "disabled");
        fieldset.append("p").text("Type canonical ip/netmask, gateway ip and metrics");
        var inputIpNetmask = fieldset.append("input").attr("type", "text").attr("placeholder", "X.X.X.X/netmask").attr("class", "input-text").style("width", 120);
        var inputGateway = fieldset.append("input").attr("type", "text").attr("placeholder", "X.X.X.X").attr("class", "input-text").style("width", 100);
        var inputMetrics = fieldset.append("input").attr("type", "text").attr("placeholder", "metrics").attr("class", "input-text").text("1").style("width", 50);
        var btnAddRoute = fieldset.append("input").attr("type", "button").attr("value", "Add route").attr("disabled", "disabled");
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
    };
    this.loadRouteList = function(netIface) {
        var ddRoutes = this.routeFieldset.dropdownRoutes;
        var routes = [];
        for (var i = 0; i < this.host.routingTable.table.length; i++) {
            var route = this.host.routingTable.table[i];
            if (route.netIface == netIface) routes.push(route);
        }
        ddRoutes.item = ddRoutes.item.data(routes);
        ddRoutes.item.enter().append("li").on("mouseup", this.hMouseUpOnRouteItem).attr("class", "dropdown-item").text(this.routeObjToString);
        ddRoutes.item.exit().remove();
        if (routes.length == 0) VisInfo.setDisabledColor(ddRoutes.pOutput, VisInfo.colorDisabled); else VisInfo.setDisabledColor(ddRoutes.pOutput, null);
        ddRoutes.pOutput.text(ddRoutes.pOutput.node().initialText);
    };
    this.routeObjToString = function(route) {
        return sprintf("%s/%d => %s", ipIntToString(route.ip), netmaskFullToShort(route.netmask), ipIntToString(route.gateway));
    };
    this.hMouseUpOnNetIfaceItem = function(netIface) {
        VisInfo.selectDropdownItem(RouteInfo.routeFieldset.dropdownNetIfaces, VisInfo.getNetIfaceName(netIface));
        RouteInfo.routeFieldset.btnAddRoute.on("click", RouteInfo.hAddRoute).property("netIface", netIface).attr("disabled", null);
        RouteInfo.routeFieldset.btnRemoveRoute.property("netIface", netIface);
        RouteInfo.loadRouteList(netIface);
    };
    this.hMouseUpOnRouteItem = function(route) {
        VisInfo.selectDropdownItem(RouteInfo.routeFieldset.dropdownRoutes, RouteInfo.routeObjToString(route));
        RouteInfo.routeFieldset.btnRemoveRoute.on("click", RouteInfo.hRemoveRoute).property("route", route).attr("disabled", null);
    };
    this.hAddRoute = function() {
        var fieldset = RouteInfo.routeFieldset;
        var address = addressStringToObj(fieldset.inputIpNetmask.property("value"));
        var gateway = ipStringToInt(fieldset.inputGateway.property("value"));
        var metrics = strToInt(fieldset.inputMetrics.property("value"));
        VisInfo.setAndResetWithDelay(fieldset.inputIpNetmask, "border-color", address == null ? "red" : "lightgreen", null, 1e3);
        VisInfo.setAndResetWithDelay(fieldset.inputGateway, "border-color", gateway == null ? "red" : "lightgreen", null, 1e3);
        if (address != null && gateway != null) {
            RouteInfo.host.routingTable.addRoute(address.ip, address.netmask, gateway, this.netIface, metrics);
            RouteInfo.loadRouteList(this.netIface);
        }
    };
    this.hRemoveRoute = function() {
        var route = this.route;
        RouteInfo.host.routingTable.removeRoute(route.ip, route.netmask, route.gateway, route.netIface);
        RouteInfo.loadRouteList(this.netIface);
    };
    this.hMouseEnterDropdownItem = function(netIface) {
        if (netIface instanceof LoopbackNetIface) return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, "green");
    };
    this.hMouseLeaveDropdownItem = function(netIface) {
        if (netIface instanceof LoopbackNetIface) return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, null);
    };
}();

var SendInfo = new function() {
    this.showSendDetails = function(fromHost, toHost) {
        this.fromHost = fromHost;
        this.toHost = toHost;
        this.sendFieldset = this.appendSendFieldset(Visualizer.fbDetail);
        if (fromHost) this.loadIpList(this.sendFieldset.dropdownFromHost, fromHost);
        if (toHost) this.loadIpList(this.sendFieldset.dropdownToHost, toHost);
    };
    this.appendSendFieldset = function(container) {
        var fieldset = container.append("fieldset");
        fieldset.append("legend").text("Send details:");
        if (this.fromHost) var dropdownFromHost = VisInfo.appendDropDown(fieldset, "Select source IP");
        if (this.toHost) var dropdownToHost = VisInfo.appendDropDown(fieldset, "Select target IP");
        var inputFromIp = fieldset.append("input").attr("type", "text").attr("placeholder", "Source IP").attr("class", "input-text").style("width", 100);
        fieldset.append("span").text("port");
        var inputFromPort = fieldset.append("input").attr("type", "text").attr("placeholder", "port").attr("class", "input-text").attr("value", "8080").style("width", 40);
        var inputToIp = fieldset.append("input").attr("type", "text").attr("placeholder", "Target IP").attr("class", "input-text").style("width", 100);
        fieldset.append("span").text("port");
        var inputToPort = fieldset.append("input").attr("type", "text").attr("placeholder", "port").attr("class", "input-text").attr("value", "8080").style("width", 40);
        fieldset.append("p");
        var inputMessage = fieldset.append("input").attr("type", "text").attr("placeholder", "Message").attr("class", "input-text");
        fieldset.append("span").text("xTimes");
        var inputXTimes = fieldset.append("input").attr("type", "text").attr("placeholder", "xTimes").attr("class", "input-text").attr("value", "1").style("width", 50);
        fieldset.append("br");
        fieldset.append("span").text("delay");
        var inputTicksDelay = fieldset.append("input").attr("type", "text").attr("placeholder", "Ticks delay").attr("class", "input-text").attr("value", "1").style("width", 50);
        fieldset.append("p");
        var btnSend = fieldset.append("input").attr("type", "button").attr("value", "Send message").on("click", this.hSend);
        return {
            fieldset: fieldset,
            dropdownFromHost: dropdownFromHost,
            dropdownToHost: dropdownToHost,
            inputFromIp: inputFromIp,
            inputFromPort: inputFromPort,
            inputToIp: inputToIp,
            inputToPort: inputToPort,
            inputMessage: inputMessage,
            inputXTimes: inputXTimes,
            inputTicksDelay: inputTicksDelay,
            btnSend: btnSend
        };
    };
    this.loadIpList = function(container, host) {
        var items = [];
        for (var i = 0; i < host.netIfaces.length; i++) {
            var netIface = host.netIfaces[i];
            items.push({
                obj: netIface,
                str: VisInfo.getNetIfaceName(netIface)
            });
            for (var j = 0; j < netIface.addresses.length; j++) {
                var ip = netIface.addresses[j].ip;
                items.push({
                    obj: ip,
                    str: ipIntToString(ip)
                });
            }
        }
        container.item = container.item.data(items);
        container.item.enter().append("li").on("mouseenter", this.hMouseEnterItem).on("mouseleave", this.hMouseLeaveItem).on("mouseup", function(d) {
            SendInfo.hMouseUpOnIpItem(container, d);
        }).attr("class", "dropdown-item").text(function(d) {
            return d.str;
        }).style("font-weight", function(d) {
            return d.obj instanceof NetIface ? "bold" : null;
        });
        container.item.exit().remove();
        if (items.length == 0) VisInfo.setDisabledColor(container.pOutput, VisInfo.colorDisabled); else VisInfo.setDisabledColor(container.pOutput, null);
        container.pOutput.text(container.pOutput.node().initialText);
    };
    this.hMouseUpOnIpItem = function(container, d) {
        if (d.obj instanceof NetIface) return;
        var ip = d.obj;
        VisInfo.selectDropdownItem(container, ipIntToString(ip));
        if (container == SendInfo.sendFieldset.dropdownFromHost) {
            SendInfo.sendFieldset.inputFromIp.attr("value", ipIntToString(ip));
        } else {
            SendInfo.sendFieldset.inputToIp.attr("value", ipIntToString(ip));
        }
    };
    this.hSend = function() {
        var fieldset = SendInfo.sendFieldset;
        var valid = true;
        var fromIp = ipStringToInt(fieldset.inputFromIp.property("value"));
        var fromPort = strToInt(fieldset.inputFromPort.property("value"));
        var toIp = ipStringToInt(fieldset.inputToIp.property("value"));
        var toPort = strToInt(fieldset.inputToPort.property("value"));
        var message = fieldset.inputMessage.property("value");
        var xTimes = strToInt(fieldset.inputXTimes.property("value"));
        var ticksDelay = strToInt(fieldset.inputTicksDelay.property("value"));
        VisInfo.setAndResetWithDelay(fieldset.inputFromIp, "border-color", null == fromIp ? "red" : "lightgreen", null, 1e3);
        VisInfo.setAndResetWithDelay(fieldset.inputFromPort, "border-color", null == fromPort ? "red" : "lightgreen", null, 1e3);
        VisInfo.setAndResetWithDelay(fieldset.inputToIp, "border-color", null == toIp ? "red" : "lightgreen", null, 1e3);
        VisInfo.setAndResetWithDelay(fieldset.inputToPort, "border-color", null == toPort ? "red" : "lightgreen", null, 1e3);
        VisInfo.setAndResetWithDelay(fieldset.inputXTimes, "border-color", null == xTimes ? "red" : "lightgreen", null, 1e3);
        VisInfo.setAndResetWithDelay(fieldset.inputTicksDelay, "border-color", null == ticksDelay ? "red" : "lightgreen", null, 1e3);
        valid = valid && null != fromIp;
        valid = valid && null != fromPort;
        valid = valid && null != toIp;
        valid = valid && null != toPort;
        valid = valid && null != xTimes;
        valid = valid && null != ticksDelay;
        if (valid) {
            for (var i = 0; i < xTimes; i++) {
                var msDelay = i * ticksDelay;
                Executor.addJob(function() {
                    SendInfo.fromHost.protocolHandlers.UDP.send(fromIp, fromPort, toIp, toPort, message);
                }, msDelay);
            }
        }
    };
    this.hMouseEnterDropdownItem = function(d) {
        var netIface = d.obj;
        if (!(netIface instanceof NetIface)) return;
        if (netIface instanceof LoopbackNetIface) return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, "green");
    };
    this.hMouseLeaveDropdownItem = function(d) {
        var netIface = d.obj;
        if (!(netIface instanceof NetIface)) return;
        if (netIface instanceof LoopbackNetIface) return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, null);
    };
}();

var SubnetInfo = new function() {
    this.hosts;
    this.getObjectName = function() {
        return "SubnetInfo";
    };
    this.showSubnetDetails = function(hosts) {
        this.hosts = hosts;
        this.netIfaces = this.checkHostsAreConnected(hosts);
        if (this.netIfaces.length == 0) return;
        this.addresses = this.getSubnets();
        this.subnetFieldset = this.appendSubnetFieldset(Visualizer.fbDetail);
        this.loadSubnetList();
    };
    this.appendSubnetFieldset = function(container) {
        var fieldset = container.append("fieldset");
        fieldset.append("legend").text("Subnet creation:");
        var dropdownSubnets = VisInfo.appendDropDown(fieldset, "Select subnet");
        var btnRemoveSubnet = fieldset.append("input").on("click", this.hRemoveSubnet).attr("type", "button").attr("value", "Remove subnet").attr("disabled", "disabled");
        fieldset.append("p").text("Type first ip/netmask for new subnet");
        var inputIpNetmask = fieldset.append("input").attr("type", "text").attr("placeholder", "X.X.X.X/netmask").attr("class", "input-text").style("width", 120);
        var btnAddSubnet = fieldset.append("input").on("click", this.hAddSubnet).attr("type", "button").attr("value", "Add subnet");
        return {
            fieldset: fieldset,
            dropdownSubnets: dropdownSubnets,
            btnRemoveSubnet: btnRemoveSubnet,
            inputIpNetmask: inputIpNetmask,
            btnAddSubnet: btnAddSubnet
        };
    };
    this.loadSubnetList = function() {
        var ddSubnets = this.subnetFieldset.dropdownSubnets;
        ddSubnets.item = ddSubnets.item.data(this.addresses);
        ddSubnets.item.enter().append("li").on("mouseup", this.hMouseUpOnSubnetItem).attr("class", "dropdown-item").text(addressObjToString);
        ddSubnets.item.exit().remove();
        this.subnetFieldset.btnRemoveSubnet.attr("disabled", "disabled");
        if (this.addresses.length == 0) VisInfo.setDisabledColor(ddSubnets.pOutput, VisInfo.colorDisabled); else VisInfo.setDisabledColor(ddSubnets.pOutput, null);
        ddSubnets.pOutput.text(ddSubnets.pOutput.node().initialText);
    };
    this.getSubnets = function() {
        var netIfaces = this.netIfaces;
        var addresses = [];
        for (var i = 0; i < netIfaces[0].addresses.length; i++) {
            var address = netIfaces[0].addresses[i];
            addresses.push({
                ip: getCanonicalIp(address.ip, address.netmask),
                netmask: address.netmask
            });
        }
        for (var i = 1; i < netIfaces.length; i++) {
            var newAddresses = [];
            for (var j = 0; j < netIfaces[i].addresses.length; j++) {
                var a = netIfaces[i].addresses[j];
                var ip = getCanonicalIp(a.ip, a.netmask);
                var netmask = a.netmask;
                for (var k = 0; k < addresses.length; k++) {
                    if (addresses[k].netmask == netmask && addresses[k].ip == ip) newAddresses.push(addresses[k]);
                }
            }
            addresses = newAddresses;
            if (addresses.length == 0) break;
        }
        return addresses;
    };
    this.checkHostsAreConnected = function(hosts) {
        var color = [];
        var toColor = hosts.length;
        for (var i = 0; i < Visualizer.nodesData.length; i++) {
            var node = Visualizer.nodesData[i];
            color[node.obj.deviceName] = {
                host: node.obj,
                selected: hosts.indexOf(node.obj) >= 0,
                c: 0
            };
        }
        var stack = new Queue(this, "bfs queue", 25, true);
        for (var i = 0; i < hosts[0].ports.length; i++) {
            var toPort = hosts[0].ports[i].toSendTMDirection.toPort;
            stack.push({
                name: toPort.owner.deviceName,
                fromPort: hosts[0].ports[i],
                toPort: toPort,
                prevPort: hosts[0].ports[i]
            });
        }
        color[hosts[0].deviceName].c = 1;
        toColor--;
        var ports = [];
        while (!stack.isEmpty()) {
            var obj = stack.pop();
            var host = color[obj.name].host;
            if (color[obj.name].c == 0) {
                for (var i = 0; i < host.ports.length; i++) {
                    var toPort = host.ports[i].toSendTMDirection.toPort;
                    if (obj.prevPort != toPort) {
                        stack.push({
                            name: toPort.owner.deviceName,
                            fromPort: color[obj.name].selected ? host.ports[i] : obj.fromPort,
                            toPort: toPort,
                            prevPort: host.ports[i]
                        });
                    }
                }
                if (color[obj.name].selected) {
                    toColor--;
                    if (obj.fromPort && !(ports.indexOf(obj.fromPort) >= 0)) ports.push(obj.fromPort);
                    if (obj.toPort && !(ports.indexOf(obj.toPort) >= 0)) ports.push(obj.toPort);
                }
            } else {
                if (obj.fromPort && !(ports.indexOf(obj.fromPort) >= 0)) ports.push(obj.fromPort);
                if (color[obj.name].selected) if (obj.toPort && !(ports.indexOf(obj.toPort) >= 0)) ports.push(obj.toPort);
            }
            color[obj.name].c = 1;
        }
        var netIfaces = [];
        if (toColor != 0) return netIfaces;
        for (var i = 0; i < ports.length; i++) if (ports[i].upperObject instanceof NetIface) netIfaces.push(ports[i].upperObject);
        return netIfaces;
    };
    this.addSubnet = function(address) {
        var ip = address.ip, netmask = address.netmask;
        for (var i = 0; i < this.netIfaces.length; i++) {
            this.netIfaces[i].addIp(ip, netmask);
            ip++;
        }
    };
    this.removeSubnet = function(address) {
        address = {
            ip: getCanonicalIp(address.ip, address.netmask),
            netmask: address.netmask
        };
        for (var i = 0; i < this.netIfaces.length; i++) {
            var netIface = this.netIfaces[i];
            for (var j = 0; j < netIface.addresses.length; j++) {
                var netmask = netIface.addresses[j].netmask;
                var ip = netIface.addresses[j].ip;
                if (address.netmask == netmask && address.ip == getCanonicalIp(ip, netmask)) netIface.removeIp(ip);
            }
        }
    };
    this.hMouseUpOnSubnetItem = function(address) {
        VisInfo.selectDropdownItem(SubnetInfo.subnetFieldset.dropdownSubnets, addressObjToString(address));
        SubnetInfo.address = address;
        SubnetInfo.subnetFieldset.btnRemoveSubnet.attr("disabled", null);
    };
    this.hAddSubnet = function() {
        var input = SubnetInfo.subnetFieldset.inputIpNetmask;
        var address = addressStringToObj(input.property("value"));
        var valid = address != null;
        if (valid) {
            if (getCanonicalIp(address.ip, address.netmask) == address.ip) address.ip++;
            var possible = getMask(32 - netmaskFullToShort(address.netmask));
            var used = (possible & address.ip) - 1;
            valid = valid && SubnetInfo.netIfaces.length < possible - used;
        }
        VisInfo.setAndResetWithDelay(input, "border-color", !valid ? "red" : "lightgreen", null, 1e3);
        if (valid) {
            SubnetInfo.addresses.push(address);
            SubnetInfo.addSubnet(address);
            SubnetInfo.loadSubnetList();
        }
    };
    this.hRemoveSubnet = function() {
        var i = SubnetInfo.addresses.indexOf(SubnetInfo.address);
        if (i >= 0) {
            SubnetInfo.addresses.splice(i, 1);
            SubnetInfo.removeSubnet(SubnetInfo.address);
            SubnetInfo.address = undefined;
            SubnetInfo.loadSubnetList();
        }
    };
}();

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
        this.label = this.gVisibleContainer.selectAll(".label");
        this.forceLayout = d3.layout.force().size([ this.width, this.height ]).nodes(this.nodesData).links(this.linksData).gravity(0).linkDistance(15).linkStrength(this.linkStrength).charge(this.charge).on("tick", this.hForceLayoutTick);
    };
    this.redrawGraphLabels = function() {
        this.label = this.label.data(this.labelsData, function(d) {
            return VisLabels.labelsData.indexOf(d);
        });
        this.label.enter().append("text").attr("class", "label").transition().duration(750).text(function(d) {
            return d.obj.getObjectName();
        });
        this.label.exit().remove();
        this.forceLayout.start();
    };
    this.redrawOnSelectionChanged = function() {
        this.label.attr("font-weight", function(d) {
            return Visualizer.selectedNodes.indexOf(d.node.node) >= 0 ? "bold" : null;
        });
    };
    this.redraw = function() {
        this.label = this.label.data(this.labelsData, function(d) {
            return VisLabels.labelsData.indexOf(d);
        });
        this.label.enter().append("text").attr("class", "label").transition().duration(750).text(function(d) {
            return d.obj.getObjectName();
        });
        this.label.exit().remove();
        this.label.attr("font-weight", function(d) {
            return Visualizer.selectedNodes.indexOf(d.node.node) >= 0 ? "bold" : null;
        });
        this.forceLayout.start();
    };
    this.hForceLayoutTick = function() {
        for (var i = 0; i < VisLabels.nodesData.length; i++) {
            if (i % 2 == 0) {
                var d = VisLabels.nodesData[i];
                d.x = d.node.x;
                d.y = d.node.y;
            }
        }
        VisLabels.label.attr("x", function(d) {
            var b = this.getBBox();
            var d = d.node;
            var diffX = d.x - d.node.x;
            var diffY = d.y - d.node.y;
            var dist = Math.sqrt(diffX * diffX + diffY * diffY);
            var shiftX = b.width * (diffX - dist) / (dist * 2);
            shiftX = Math.max(-b.width, Math.min(0, shiftX));
            return d.x + shiftX;
        }).attr("y", function(d, i) {
            return d.node.y + 5;
        });
    };
    this.addNode = function(node) {
        var x = {
            node: node,
            x: node.x,
            y: node.y
        };
        var y = {
            node: node,
            x: node.x,
            y: node.y
        };
        this.nodesData.push(x);
        this.nodesData.push(y);
        this.linksData.push({
            source: x,
            target: y,
            weight: 1
        });
        this.labelsData.push({
            node: y,
            obj: y.node.obj
        });
    };
    this.removeNode = function(node, i) {
        this.nodesData.splice(i * 2, 2);
        this.linksData.splice(i, 1);
        this.labelsData.splice(i, 1);
    };
}();
