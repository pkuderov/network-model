network-model
=============

This project simulates (maybe partly emulates) tcp\ip network and visualizes it.
It's consist of two vastly independent parts:
 * network engine with tcp/ip protocols and some network devices simulation
 * graphic editor which allows to user to create/edit network graph, set it's components settings like ip-addresses, routings tables and send dynamically UDP datagrams between hosts. It visualizes messages flow (very simplified) between network graph nodes and write to console log what's going on behind the scene (log shows a path of packets in details, it's inner structure, detailed error messages and etc.)

This javascript was built with great help of following external libraries:
 * [sprintf.js](https://code.google.com/p/sprintf/) - it was very useful for formatting log information
 * [d3.js] (http://d3js.org/) - the power of this library was very helpful for creating network graph visualisation. Also it was used as jquery analogue to create dynamic behavior of graphic editor at all.

To try it online, go to [this page](http://pkuderov.github.io/network-model/vis_main.html).
To create network:
  * choose node type by clicking on one of the upper buttons (host=pc, switch, router)
  * **shift + click on clear plane** - create node
  * **click on node** - select node
  * **ctrl + click on node** - add or remove node from current selection
  * **ctrl + click and press on plane** - choose selection area
  * **shift + click on clear plane + having selected group of nodes** - create node linked to that group
  * **shift + click on node + having selected group of nodes** - link that node with the group
  * **'r' + selected group of nodes** - remove group of nodes (or single node)
  * add IP and routes for selected single node
  * create subnet and create routes for selected group

'freeze' button will change state and allow to send messages from one host to another:
  * select one node and choose from which its IP and to which IP to send a message
  * or select 2 nodes and first selected node will be sender and 2nd will be the receiver
  * **click 'send'** - send message
  * **click 'play'** - start emulation
  * you can open browser javascript console to look at detail message delivery

There's a simple test example - type Visualizer.test2() in console than 'freeze' -> 'play' to see it in action.
