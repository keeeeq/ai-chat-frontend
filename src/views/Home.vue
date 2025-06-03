<template>
  <div class="home-container">
    <el-header>
      <div class="header-content">
        <h1>AI 工具导航站</h1>
        <el-tag type="info" effect="dark">智能工具集合</el-tag>
      </div>
    </el-header>
    <div class="tools-grid">
      <el-card
        v-for="tool in tools"
        :key="tool.id"
        class="tool-card"
        @click="navigateTo(tool.route)"
      >
        <div class="tool-icon">
          <el-icon :size="40">
            <component :is="tool.icon" />
          </el-icon>
        </div>
        <h2>{{ tool.name }}</h2>
        <p>{{ tool.description }}</p>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  ChatDotRound,
  Picture,
  VideoCamera,
  Document,
} from "@element-plus/icons-vue";

const router = useRouter();

const tools = ref([
  {
    id: 1,
    name: "AI 聊天助手",
    description: "智能对话，解答问题",
    icon: "ChatDotRound",
    route: "/chat",
  },
  {
    id: 2,
    name: "游戏模式",
    description: "有趣的AI互动游戏",
    icon: "Picture",
    route: "/game-mode",
  },
  {
    id: 3,
    name: "小说客服",
    description: "智能小说客服助手",
    icon: "VideoCamera",
    route: "/novel-service",
  },
  {
    id: 4,
    name: "PDF知识库",
    description: "个人RAG知识库，支持PDF文件上传和智能问答",
    icon: "Document",
    route: "/ai/pdf",
  },
]);

const navigateTo = (route) => {
  router.push(route);
};
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.el-header {
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  color: white;
  padding: 0 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  height: 80px;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
}

.tools-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.tool-card {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 30px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.tool-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.tool-icon {
  margin-bottom: 20px;
  color: #409eff;
  background: #ecf5ff;
  padding: 20px;
  border-radius: 50%;
}

.tool-card h2 {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #303133;
}

.tool-card p {
  margin: 0;
  color: #606266;
  font-size: 16px;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .tools-grid {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .el-header {
    padding: 0 20px;
  }

  .header-content h1 {
    font-size: 24px;
  }
}
</style>
