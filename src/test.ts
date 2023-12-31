import { textToSearchParameters } from "./textToSearchParameters"

const questions = [
  "経営ミーティングの資料を探して",
  "昨日、北斗がシェアしたスライドがほしい",
  "仕様書の PDF はどこにある？",
  "先月作った、動画のリンクを教えて",
  "来週つかう広告画像を探して",
  "プロジェクト計画の資料はどこにありますか？",
  "昨日の会議ノートはどこにありますか？",
  "先週のプレゼンテーションスライドはどこにありますか？",
  "PDF形式の最新のマーケティングレポートはどこにアップロードされましたか？",
  "次のミーティングのための資料は既に準備されていますか？",
  "その技術的な図はどこにありますか？",
  "昨日の会議の録音はどこで確認できますか？",
  "明日のプレゼンテーションのドラフトはどこにありますか？",
  "計画書の最新バージョンはどこで見つけることができますか？",
  "昨日のミーティングで共有された資料はどこに保存されていますか？",
  "都市計画プロジェクトのデザインドキュメントはどこにありますか？",
  "我々のチームの資料はどこにありますか？",
  "ビデオチュートリアルはどこにアップロードされていますか？",
  "先月のレポートはどこにありますか？",
  "去年使った、報告書はどこですか？",
  "新しいスタッフトレーニングガイドはどこにありますか？",
  "その試験結果のスプレッドシートはどこにありますか？",
]

;(async () => {
  for (const question of questions) {
    const args = await textToSearchParameters(question)
    console.log("-----")
    console.log(question)
    console.log(args)
  }
})()