import requests
import os
from dotenv import load_dotenv

# 加载配置（避免硬编码敏感信息）
load_dotenv()
GITLAB_URL = os.getenv("GITLAB_URL", "http://10.168.1.106")  # 你的私有化GitLab域名（如https://gitlab.xxx.com）
GITLAB_TOKEN = os.getenv("GITLAB_TOKEN", "AAJ9MmxxUyFdsWR48gnb")  # 第一步获取的个人访问令牌
USERNAME = os.getenv("GITLAB_USERNAME", "luzhenkai")  # 你的GitLab用户名
GIT_AUTHOR_NAME = os.getenv("GIT_AUTHOR_NAME", "路振凯")  # Git提交时使用的真实姓名（可能是中文）
START_DATE = "2025-01-01"  # 统计开始时间
END_DATE = "2025-12-31"    # 统计结束时间

# 请求头（携带令牌鉴权）
headers = {
    "PRIVATE-TOKEN": GITLAB_TOKEN,
    "Content-Type": "application/json"
}

def get_user_projects():
    """第一步：获取个人参与的所有项目"""
    query = """
    query {
      currentUser {
        projectMemberships(first: 100) {
          nodes {
            project {
              name
              fullPath
              webUrl
            }
          }
        }
      }
    }
    """
    response = requests.post(
        f"{GITLAB_URL}/api/graphql",
        json={"query": query},
        headers=headers
    )
    response.raise_for_status()
    data = response.json()
    print(f"API响应: {data}")  # 调试信息
    if "data" in data and data["data"]["currentUser"]:
        return [node["project"] for node in data["data"]["currentUser"]["projectMemberships"]["nodes"]]
    return []

def get_project_contributions(project_fullpath):
    """第二步：获取单个项目的年度贡献数据（使用REST API）"""
    # 将fullPath转换为project_id（需要URL编码）
    project_id = project_fullpath.replace("/", "%2F")
    
    # 使用REST API获取commits
    commits_url = f"{GITLAB_URL}/api/v4/projects/{project_id}/repository/commits"
    params = {
        "since": f"{START_DATE}T00:00:00Z",
        "until": f"{END_DATE}T23:59:59Z",
        "per_page": 100,
        "page": 1
    }
    
    all_commits = []
    while True:
        response = requests.get(commits_url, params=params, headers=headers)
        response.raise_for_status()
        commits = response.json()
        if not commits:
            break
        all_commits.extend(commits)
        params["page"] += 1
        if len(commits) < 100:  # 最后一页
            break
    
    # 过滤当前用户的commits（使用Git作者名或邮箱匹配）
    # 调试：查看实际的作者名和邮箱
    if all_commits:
        print(f"  项目 {project_fullpath} 共有 {len(all_commits)} 个commits")
        print(f"  示例commit - 作者: {all_commits[0].get('author_name')}, 邮箱: {all_commits[0].get('author_email')}")
        # 打印所有不同的作者名和邮箱
        authors = set((c.get('author_name'), c.get('author_email')) for c in all_commits)
        print(f"  所有作者: {authors}")
    
    # 使用多条件匹配：作者名匹配 或 邮箱包含用户名 或 作者名为"Your Name"
    user_commits = [c for c in all_commits if 
                   c.get("author_name") == GIT_AUTHOR_NAME or 
                   c.get("committer_name") == GIT_AUTHOR_NAME or
                   c.get("author_name") == "Your Name" or
                   c.get("committer_name") == "Your Name" or
                   (c.get("author_email") and USERNAME in c.get("author_email", "").lower())]
    print(f"  匹配到 {len(user_commits)} 个当前用户的commits")
    
    # 计算代码行数统计
    total_additions = 0
    total_deletions = 0
    
    for commit in user_commits:
        # 获取每个commit的详细信息
        commit_detail_url = f"{GITLAB_URL}/api/v4/projects/{project_id}/repository/commits/{commit['id']}"
        try:
            detail_response = requests.get(commit_detail_url, headers=headers)
            detail_response.raise_for_status()
            detail = detail_response.json()
            stats = detail.get("stats", {})
            total_additions += stats.get("additions", 0)
            total_deletions += stats.get("deletions", 0)
        except:
            pass
    
    return {
        "name": project_fullpath.split("/")[-1],
        "webUrl": f"{GITLAB_URL}/{project_fullpath}",
        "contributions": {
            "totalCommits": len(user_commits),
            "totalAdditions": total_additions,
            "totalDeletions": total_deletions,
            "commits": {
                "nodes": [{
                    "oid": c["id"],
                    "message": c["message"],
                    "committedAt": c["committed_date"],
                    "author": {
                        "name": c.get("author_name", ""),
                        "email": c.get("author_email", "")
                    }
                } for c in user_commits[:200]]  # 限制200条
            }
        }
    }

def generate_markdown_report(projects_contrib):
    """生成Markdown格式统计文档"""
    total_commits = 0
    total_additions = 0
    total_deletions = 0

    markdown = f"# 年度GitLab贡献统计报告\n\n"
    markdown += f"**统计时间**：{START_DATE} 至 {END_DATE}\n"
    markdown += f"**统计用户**：{USERNAME}\n\n"

    # 汇总所有项目数据
    for contrib in projects_contrib:
        project_name = contrib["name"]
        project_url = contrib["webUrl"]
        stats = contrib["contributions"]
        commits = stats["commits"]["nodes"]

        # 累加总数据
        total_commits += stats["totalCommits"]
        total_additions += stats["totalAdditions"]
        total_deletions += stats["totalDeletions"]

        # 项目详情
        markdown += f"## 项目：[{project_name}]({project_url})\n\n"
        markdown += f"| 统计项       | 数值       |\n"
        markdown += f"|--------------|------------|\n"
        markdown += f"| 提交次数     | {stats['totalCommits']} |\n"
        markdown += f"| 新增代码行数 | {stats['totalAdditions']} |\n"
        markdown += f"| 删除代码行数 | {stats['totalDeletions']} |\n"
        markdown += f"| 净增代码行数 | {stats['totalAdditions'] - stats['totalDeletions']} |\n\n"

        # Commit详情
        if commits:
            markdown += f"### Commit记录（共{len(commits)}条）\n\n"
            markdown += f"| Commit ID  | 提交时间          | 提交信息                  |\n"
            markdown += f"|------------|-------------------|---------------------------|\n"
            for commit in commits:
                commit_id = commit["oid"][:8]  # 简化Commit ID（前8位）
                commit_time = commit["committedAt"].split("T")[0]  # 提取日期
                commit_msg = commit["message"].split("\n")[0]  # 提取首行信息（避免过长）
                markdown += f"| {commit_id} | {commit_time} | {commit_msg} |\n"
        markdown += "\n---\n\n"

    # 全局汇总
    markdown += f"## 全局贡献汇总\n\n"
    markdown += f"| 统计项       | 数值       |\n"
    markdown += f"|--------------|------------|\n"
    markdown += f"| 参与项目数   | {len(projects_contrib)} |\n"
    markdown += f"| 总提交次数   | {total_commits} |\n"
    markdown += f"| 总新增行数   | {total_additions} |\n"
    markdown += f"| 总删除行数   | {total_deletions} |\n"
    markdown += f"| 总净增行数   | {total_additions - total_deletions} |\n"

    # 保存文档
    with open("年度GitLab贡献统计报告.md", "w", encoding="utf-8") as f:
        f.write(markdown)
    print("统计完成！报告已保存为：年度GitLab贡献统计报告.md")

if __name__ == "__main__":
    try:
        # 1. 获取参与的项目列表
        print("正在获取参与的项目列表...")
        projects = get_user_projects()
        print(f"共获取到 {len(projects)} 个参与项目\n")

        # 2. 遍历项目统计贡献
        projects_contrib = []
        for i, project in enumerate(projects, 1):
            print(f"正在统计项目 {i}/{len(projects)}：{project['name']}")
            contrib = get_project_contributions(project["fullPath"])
            if contrib["contributions"]["totalCommits"] > 0:  # 只保留有贡献的项目
                projects_contrib.append(contrib)

        # 3. 生成报告
        generate_markdown_report(projects_contrib)
    except Exception as e:
        print(f"统计失败：{str(e)}")