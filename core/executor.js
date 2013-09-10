var Executor = new function() {
    this.pauseBetweenTicksInMs = 50;
    
    //hack to make currentTick == 0 when initialization (at prepareNextTickExectuion())
    this.currentTick = -1;
     
    this.indexToCall = 0;
    this.timerId;
    this.activeObjects;
    
    //methods
    this.isTickExecutionDone = function() {
        return this.indexToCall == this.activeObjects.length;
    }    
    this.invokeCurrentActiveObject = function() {
        return this.activeObjects[this.indexToCall].doElementaryAction();
    }
    //cannot be paused during this method execution
    this.doElementaryActionsUntilValuableOrTickDone = function() {    
        while (!this.isTickExecutionDone() && !this.invokeCurrentActiveObject()) {
            this.indexToCall++;
        }
        
        if (this.isTickExecutionDone()) {            
            Visualizer.redraw();
            this.prepareNextTickExectuion();
        }
        else
            this.indexToCall++;
    }
    this.doTickUntilDone = function() {
        while (!this.isTickExecutionDone()) {
            this.invokeCurrentActiveObject();
            this.indexToCall++;
        }
        
        Visualizer.redraw();
        this.prepareNextTickExectuion();
    }
    this.isPaused = function() {
        return !this.timerId;
    }
    this.pause = function() {
        if (!this.isPaused()) {
            window.clearInterval(this.timerId);
            this.timerId = undefined;
        }
    }
    this.stepForward = function() {
        if (this.isPaused()) {
            this.doElementaryActionsUntilValuableOrTickDone();
        }
    }
    this.play = function() {
        if (this.isPaused()) {
            this.timerId = window.setInterval("Executor.doTickUntilDone()", this.pauseBetweenTicksInMs);
        }
    }
    this.prepareNextTickExectuion = function() {    
        this.indexToCall = 0;        
        this.activeObjects = Environment.getActiveElementaryObjects();
        
        this.currentTick ++;
        if ((this.currentTick % (1000 / this.pauseBetweenTicksInMs)) == 0)
            log('vtime:      %s', this.currentTick);
    }
    
    //initialization
    this.prepareNextTickExectuion();
}
