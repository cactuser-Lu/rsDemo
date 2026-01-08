interface User {
  name: string;
  sayHi: () => void;
}

interface User {
  id: number;
}

interface menUser extends User {
  sex: string;
}

const men: menUser = {
  name : "",
  id : 1,
  sex :"",
  sayHi:()=> {
  }
};

class userIm implements menUser {
  name = "";
  id = 1;
  sex = "";
  sayHi() {
    console.log(`Hi, ${this.name}`);
  }
}

type orderStatus = "pending" | "cancel";

const Status: orderStatus = "cancel";

type order = { id: string; amount: number };

type user = { id: string; name: string };

type orderAndUser = order & user;

const order: orderAndUser = {
  id: "",
  name: "",
  amount: 3,
};

/**
 * 同名接口自动合并 类可 implements
 * 联合类型 定义基本类型别名
*/