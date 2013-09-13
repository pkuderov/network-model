var Executor = new function() {
    this.pauseBetweenTicksInMs = 100;
    
    //hack to make currentTick == 0 when initialization (at prepareNextTickExectuion())
    this.currentTick = -1;
    
    this.objectTypeName = 'Executor'; 
    this.indexToCall = 0;
    this.timerId;
    this.jobs = new Queue(this, 'jobs queue', 25, true);
    this.activeObjects = [];
    
    //methods
    this.getObjectName = function() {
        return this.objectTypeName;
    }
    this.isTickExecutionDone = function() {
        return this.indexToCall == this.activeObjects.length;
    }    
    this.invokeCurrentActiveObject = function() {
        return this.activeObjects[this.indexToCall].doElementaryAction();
    }
    //cannot be paused during this method execution
    this.doElementaryActionsUntilValuableOrTickDone = function() {    
        this.runJobs();
        
        while (!this.isTickExecutionDone() && !this.invokeCurrentActiveObject()) {
            this.indexToCall++;
        }
        
        if (this.isTickExecutionDone()) {            
            Visualizer.redrawMessages();
            this.prepareNextTickExectuion();
        }
        else
            this.indexToCall++;
    }
    this.doTickUntilDone = function() {    
        this.runJobs();
        
        while (!this.isTickExecutionDone()) {
            this.invokeCurrentActiveObject();
            this.indexToCall++;
        }
        
        Visualizer.redrawMessages();
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
            this.timerId = window.setInterval(function() { Executor.doTickUntilDone(); }, this.pauseBetweenTicksInMs);
        }
    }
    this.prepareNextTickExectuion = function() {    
        this.indexToCall = 0;        
        this.activeObjects = Environment.getActiveElementaryObjects();
        
        this.currentTick ++;
        if ((this.currentTick % Math.floor(5000 / this.pauseBetweenTicksInMs)) == 0)
            log('vtime:      %s', this.currentTick);
    }
    this.addJob = function(func, runTickDelay) {
        this.jobs.push({ func: func, runTick: (this.currentTick + runTickDelay) });
    }
    this.runJobs = function() {        
        while (!this.jobs.isEmpty()) {
            if (this.jobs.peek().runTick > this.currentTick)
                break;
            
            var job = this.jobs.pop();
            job.func();
        }
    }
    
    //initialization
    this.prepareNextTickExectuion();
}
