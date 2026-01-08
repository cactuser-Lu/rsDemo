var name = "my name is window";
var obj = {
  name: "my name is obj",
  fn: function () {
    var timer = null;
    clearInterval(timer);
    timer = setInterval(function () {
      console.log(this.name); //my name is obj
    }.bind(this), 1000);
  },
};
obj.fn()