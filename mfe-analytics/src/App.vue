<template>
  <div class="container">
    <h2 class="title">Analytics</h2>
    <p class="meta">Team: Data · <strong>Vue 3</strong> · v0.1.0 · Separate runtime from React</p>

    <div class="stats">
      <StatCard label="Page Views" :value="stats.pageViews" trend="+12%" />
      <StatCard label="Unique Users" :value="stats.users" trend="+8%" />
      <StatCard label="Bounce Rate" :value="stats.bounceRate" trend="-3%" />
    </div>

    <div class="note">
      Vue 3 runs its own runtime — zero Module Federation sharing with React.
      Both frameworks coexist on the same page without conflict.
    </div>

    <button class="danger" @click="crash">Crash this MFE</button>
  </div>
</template>

<script>
import StatCard from './StatCard.vue';

export default {
  name: 'AnalyticsApp',
  components: { StatCard },
  data() {
    return {
      stats: {
        pageViews: '124,832',
        users: '38,471',
        bounceRate: '42%',
      },
    };
  },
  methods: {
    crash() {
      throw new Error('Analytics MFE deliberately crashed');
    },
  },
};
</script>

<style scoped>
/* "scoped" = Vue adds a unique data-v-xxxxxxxx attribute to each element.
   Same isolation goal as CSS Modules — class names don't leak between MFEs. */
.container {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.title {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
  color: #1a1a2e;
}

.meta {
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.note {
  background: #f0f4ff;
  border-left: 3px solid #4361ee;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #333;
  margin-bottom: 1.5rem;
  border-radius: 0 4px 4px 0;
}

.danger {
  background: #fff;
  color: #c00;
  border: 1px solid #c00;
  padding: 0.6rem 1.25rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}
</style>
