import React, { useState, Activity } from "react";

import { Segmented } from "antd";

import ButtonWithModal1 from "./ButtonWithModal1";
import ButtonWithModal2 from "./ButtonWithModal2";

const ActivateDemo: React.FC = () => {
  const [comp, setComp] = useState("1");

  return (
    <div>
      <div
        style={{
          marginBottom: 8,
        }}
      >
        <Segmented<string>
          options={["1", "2"]}
          value={comp}
          onChange={setComp}
        />
      </div>

      <Activity mode={comp === "1" ? "visible" : "hidden"}>
        <ButtonWithModal1 />
      </Activity>

      <Activity mode={comp === "2" ? "visible" : "hidden"}>
        <ButtonWithModal2 />
      </Activity>
    </div>
  );
};

export default ActivateDemo;
