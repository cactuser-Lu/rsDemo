import requests
import os
from dotenv import load_dotenv

# 加载配置
load_dotenv()
GITLAB_URL = os.getenv("GITLAB_URL", "http://10.168.1.106")
GITLAB_TOKEN = os.getenv("GITLAB_TOKEN", "AAJ9MmxxUyFdsWR48gnb")
START_DATE = "2025-01-01"
END_DATE = "2025-12-31"

headers = {
    "PRIVATE-TOKEN": GITLAB_TOKEN,
    "Content-Type": "application/json"
}

def get_project_branches(project_fullpath):
    """获取项目的所有分支"""
    project_id = project_fullpath.replace("/", "%2F")
    branches_url = f"{GITLAB_URL}/api/v4/projects/{project_id}/repository/branches"
    
    response = requests.get(branches_url, headers=headers)
    response.raise_for_status()
    branches = response.json()
    return [branch["name"] for branch in branches]

def get_branch_commits(project_fullpath, branch_name):
    """获取指定分支的所有贡献"""
    project_id = project_fullpath.replace("/", "%2F")
    commits_url = f"{GITLAB_URL}/api/v4/projects/{project_id}/repository/commits"
    params = {
        "ref_name": branch_name,
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
        if len(commits) < 100:
            break
    
    # 统计每个作者的贡献
    author_stats = {}
    total_additions = 0
    total_deletions = 0
    
    for commit in all_commits:
        author_name = commit.get("author_name", "Unknown")
        
        if author_name not in author_stats:
            author_stats[author_name] = {
                "commits": 0,
                "additions": 0,
                "deletions": 0,
                "commit_list": []
            }
        
        author_stats[author_name]["commits"] += 1
        author_stats[author_name]["commit_list"].append(commit)
        
        # 获取详细信息
        commit_detail_url = f"{GITLAB_URL}/api/v4/projects/{project_id}/repository/commits/{commit['id']}"
        try:
            detail_response = requests.get(commit_detail_url, headers=headers)
            detail_response.raise_for_status()
            detail = detail_response.json()
            stats = detail.get("stats", {})
            additions = stats.get("additions", 0)
            deletions = stats.get("deletions", 0)
            author_stats[author_name]["additions"] += additions
            author_stats[author_name]["deletions"] += deletions
            total_additions += additions
            total_deletions += deletions
        except:
            pass
    
    return {
        "total_commits": len(all_commits),
        "total_additions": total_additions,
        "total_deletions": total_deletions,
        "author_stats": author_stats,
        "all_commits": all_commits
    }

def generate_branch_report(project_name, branch_name, stats):
    """生成分支统计报告"""
    markdown = f"# {project_name} - {branch_name} 分支贡献统计\n\n"
    markdown += f"**统计时间**：{START_DATE} 至 {END_DATE}\n\n"
    
    markdown += f"## 整体统计\n\n"
    markdown += f"| 统计项       | 数值       |\n"
    markdown += f"|--------------|------------|\n"
    markdown += f"| 总提交次数   | {stats['total_commits']} |\n"
    markdown += f"| 总新增行数   | {stats['total_additions']} |\n"
    markdown += f"| 总删除行数   | {stats['total_deletions']} |\n"
    markdown += f"| 总净增行数   | {stats['total_additions'] - stats['total_deletions']} |\n\n"
    
    markdown += f"## 各作者贡献统计\n\n"
    markdown += f"| 作者 | 提交次数 | 新增行数 | 删除行数 | 净增行数 |\n"
    markdown += f"|------|----------|----------|----------|----------|\n"
    
    # 按提交次数排序
    for author, data in sorted(stats["author_stats"].items(), key=lambda x: x[1]["commits"], reverse=True):
        net = data["additions"] - data["deletions"]
        markdown += f"| {author} | {data['commits']} | {data['additions']} | {data['deletions']} | {net} |\n"
    
    markdown += f"\n## 详细Commit记录\n\n"
    for author, data in sorted(stats["author_stats"].items(), key=lambda x: x[1]["commits"], reverse=True):
        markdown += f"### {author} ({data['commits']}个提交)\n\n"
        markdown += f"| Commit ID | 提交时间 | 提交信息 |\n"
        markdown += f"|-----------|----------|----------|\n"
        for commit in data["commit_list"]:
            commit_id = commit["id"][:8]
            commit_time = commit["committed_date"].split("T")[0]
            commit_msg = commit["message"].split("\n")[0][:50]
            markdown += f"| {commit_id} | {commit_time} | {commit_msg} |\n"
        markdown += "\n"
    
    filename = f"{project_name}_{branch_name}_统计报告.md"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(markdown)
    print(f"报告已保存：{filename}")

if __name__ == "__main__":
    try:
        # 1. front项目的master_hy分支
        print("正在统计 front/master_hy 分支...")
        front_stats = get_branch_commits("wangshifei/front", "master_hy")
        generate_branch_report("front", "master_hy","master_zj", front_stats)
        
        # 2. front项目的master_fjii分支
        print("\n正在统计 front/master_fjii 分支...")
        front_fjii_stats = get_branch_commits("wangshifei/front", "master_fjii")
        generate_branch_report("front", "master_fjii", front_fjii_stats)
        
        # 3. 统计之前匹配为0的项目（所有分支）
        zero_projects = [
            "wangshifei/bf-config",
            "wangshifei/vue-gdbfh",
            "wangshifei/bhf-catalogue",
            "zz/army-border-pro"
        ]
        
        for project_path in zero_projects:
            project_name = project_path.split("/")[-1]
            print(f"\n正在获取 {project_name} 的所有分支...")
            
            try:
                branches = get_project_branches(project_path)
                print(f"  找到 {len(branches)} 个分支: {', '.join(branches)}")
                
                # 汇总所有分支的统计
                combined_stats = {
                    "total_commits": 0,
                    "total_additions": 0,
                    "total_deletions": 0,
                    "author_stats": {},
                    "all_commits": []
                }
                
                for branch in branches:
                    print(f"  正在统计分支: {branch}...")
                    stats = get_branch_commits(project_path, branch)
                    
                    # 合并统计
                    combined_stats["total_commits"] += stats["total_commits"]
                    combined_stats["total_additions"] += stats["total_additions"]
                    combined_stats["total_deletions"] += stats["total_deletions"]
                    combined_stats["all_commits"].extend(stats["all_commits"])
                    
                    # 合并作者统计
                    for author, data in stats["author_stats"].items():
                        if author not in combined_stats["author_stats"]:
                            combined_stats["author_stats"][author] = {
                                "commits": 0,
                                "additions": 0,
                                "deletions": 0,
                                "commit_list": []
                            }
                        combined_stats["author_stats"][author]["commits"] += data["commits"]
                        combined_stats["author_stats"][author]["additions"] += data["additions"]
                        combined_stats["author_stats"][author]["deletions"] += data["deletions"]
                        combined_stats["author_stats"][author]["commit_list"].extend(data["commit_list"])
                
                if combined_stats["total_commits"] > 0:
                    generate_branch_report(project_name, "all_branches", combined_stats)
                else:
                    print(f"  {project_name} 在指定时间段内无提交")
            except Exception as e:
                print(f"  {project_name} 统计失败: {str(e)}")
        
        print("\n所有统计完成！")
    except Exception as e:
        print(f"统计失败：{str(e)}")
        import traceback
        traceback.print_exc()
