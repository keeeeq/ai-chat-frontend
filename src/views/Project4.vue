<template>
  <div class="project-container">
    <el-header>
      <div class="header-content">
        <h1 class="header-title" @click="goToHome">AI 工具导航站</h1>
        <el-tag type="info" effect="dark">项目4描述</el-tag>
      </div>
    </el-header>
    <div class="content">
      <el-empty description="功能开发中..." />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const goToHome = () => {
  router.push("/");
};
</script>

<style scoped>
.project-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.el-header {
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  color: white;
  padding: 0 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  height: 80px;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
}

.content {
  padding: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
}

.header-title {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  padding: 5px 10px;
  border-radius: 4px;
}

.header-title:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.header-title:active {
  transform: scale(0.98);
}
</style>
