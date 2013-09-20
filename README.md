network-model
=============

This project simulates (maybe partly emulates) tcp\ip network and visualizes it.
It's consist of two vastly independent parts
 * network engine with tcp/ip protocols and some network devices simulation
 * graphic editor which allows to user to create/edit network graph, set it's components settings like ip-addresses, routings tables and send dynamically UDP datagrams between hosts. It visualizes messages flow (very simplified) between network graph nodes and write to console log what's going on behind the scene (log shows a path of packets in details, it's inner structure, detailed error messages and etc.)

This javascript was built with great help of following external libraries:
 * [sprintf.js](https://code.google.com/p/sprintf/) - it was very useful for formatting log information
 * [d3.js] (http://d3js.org/) - the power of this library was very helpful for creating network graph visualisation. Also it was used as jquery analogue to create dynamic behavior of graphic editor at all.
