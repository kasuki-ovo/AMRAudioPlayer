# AMRAudioPlayer

#### 1、介绍
AMR音频播放器demo
* amr文件在audio标签播放的解决方案，包括二进制文件头为#!AMR（AMR-NB）和#!AMR-WB（AMR-WB）的amr文件

#### 2、软件架构
amrnb.js、amrwb-js


#### 3、使用说明

把amr格式转为wav格式的Uint8Array数据，用这个Uint8Array数据生成一个Blob对象，再使用URL.createObjectURL(blob)生成一个临时地址放在audio标签上，实现amr文件在audio标签播放

#### 4、demo预览图

![demo预览图](https://foruda.gitee.com/images/1723079968121044096/a96b1c46_4880364.png)

