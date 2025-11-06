import React from "react";
import DrawerTree from "../components/Drawer/Drawer";

const data = [
  {
    title: "Drawer 1",
    children: [
      { title: "Drawer 1-1" ,children: [{ title: "Drawer 1-2-1" }, { title: "Drawer 1-2-2" }],},
      {
        title: "Drawer 1-2",
        children: [{ title: "Drawer 1-2-1" }, { title: "Drawer 1-2-2" }],
      },
    ],
  },
  {
    title: "Drawer 2",
    children: [
      { title: "Drawer 2-1" },
      {
        title: "Drawer 2-2",
        children: [
          {
            title: "Drawer 2-2-1",
            children: [
              {
                title: "Drawer 1-2-1",
                children: [
                  {
                    title: "Drawer 1-2-1",
                    children: [
                      { title: "Drawer 1-2-1" },
                      { title: "Drawer 1-2-2" },
                    ],
                  },
                  {
                    title: "Drawer 1-2-2",
                    children: [
                      { title: "Drawer 1-2-1" },
                      { title: "Drawer 1-2-2" },
                    ],
                  },
                ],
              },
              { title: "Drawer 1-2-2" },
            ],
          },
        ],
      },
    ],
  },
];

const Drawer = () => {
  return (
    <div>
      <h1>React Drawer Demo</h1>
      <DrawerTree data={data} />
    </div>
  );
};

export default Drawer;
