import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import BattleView from '../views/BattleView.vue'
import WrongView from '../views/WrongView.vue'
import FeaturePlaceholderView from '../views/FeaturePlaceholderView.vue'
import SpellingView from '../views/SpellingView.vue'
import BookDetailView from '../views/BookDetailView.vue'
import SearchView from '../views/SearchView.vue'
import BookCenterView from '../views/BookCenterView.vue'
import ReadingListView from '../views/ReadingListView.vue'
import ReadingDetailView from '../views/ReadingDetailView.vue'
import ReadingImportView from '../views/ReadingImportView.vue'
import PersonalView from '../views/PersonalView.vue'

const routes = [
  {
    path: '/',
    component: HomeView
  },
  {
    path: '/battle',
    component: BattleView
  },
  {
    path: '/wrong',
    component: WrongView
  },
  {
    path: '/spelling',
    component: SpellingView
  },
  {
    path: '/book/:id',
    component: BookDetailView
  },
  {
    path: '/books',
    component: BookCenterView
  },
  {
    path: '/search',
    component: SearchView
  },
  {
    path: '/reading',
    component: ReadingListView
  },
  {
    path: '/reading/:id',
    component: ReadingDetailView
  },
  {
    path: '/reading/import',
    component: ReadingImportView
  },
  {
    path: '/profile',
    component: PersonalView
  },
  {
    path: '/feature/:key',
    component: FeaturePlaceholderView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
