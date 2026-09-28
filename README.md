# flowcut

流网剖面台（原生 ES 模块，零依赖）：有向容量网络上跑 Dinic 分层阻塞流——
残量用弧对表示，一轮先做 BFS 分层，再在层号图上推整轮阻塞流（当前弧+死胡同回退），
找不到路之后把最小割（残量可达集的补集）重算一遍，失败一动都不许动网。

## 起服务看页面

    python3 -m http.server 8000

浏览器打开 http://127.0.0.1:8000/ 即可：主视图是流网剖面，每个节点按层号占一列，
每条边是一条带宽等于容量的带子，带子里深色的一段是流量；找不到路之后会画出割线与阴影侧。
下方轮次轨点一段就能回看那一步的网，再下面是累计的增广链（红虚线是反悔弧）。

## 要补的文件

    flow.js   checkNet / levels / blocking / applyPath / valueOf / cutOf
    ops.js    addEdge / round / reset

audit.js、app.js、check_sample.js、tests/run.js 与页面都已写好，只调不写。

## 测试

    node tests/run.js

## 场景自检

    node check_sample.js
