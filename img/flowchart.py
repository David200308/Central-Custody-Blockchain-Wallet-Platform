from graphviz import Digraph

flowchart = Digraph("User_Account_and_Signature", format="png")
flowchart.attr(rankdir="TB", size="8")

flowchart.node("Start", "Start", shape="oval")
flowchart.node("CreateAccount", "User creates account\n(email + passkey)", shape="box")
flowchart.node("CreateWallet", "Blockchain wallet\ncreated in backend", shape="box")
flowchart.node("InputMessage", "User writes message\nor inputs transaction", shape="box")
flowchart.node("VerifyPasskey", "Verify user passkey", shape="diamond")
flowchart.node("GenerateSignature", "Generate signature", shape="box")
flowchart.node("SignatureBack", "Send signature\nback to user", shape="box")
flowchart.node("VerifySignature", "User verifies signature\nin verification tab", shape="box")
flowchart.node("End", "End", shape="oval")

flowchart.edge("Start", "CreateAccount")
flowchart.edge("CreateAccount", "CreateWallet")
flowchart.edge("CreateWallet", "InputMessage")
flowchart.edge("InputMessage", "VerifyPasskey")
flowchart.edge("VerifyPasskey", "GenerateSignature", label="yes")
flowchart.edge("VerifyPasskey", "InputMessage", label="no")
flowchart.edge("GenerateSignature", "SignatureBack")
flowchart.edge("SignatureBack", "VerifySignature")
flowchart.edge("VerifySignature", "End")

flowchart_filepath = "./flowchart"
flowchart.render(flowchart_filepath, view=False)
flowchart_filepath + ".png"
