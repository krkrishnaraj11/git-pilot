use crate::db::{DbIdentity, IdentityRule};
use crate::scanner::RepoInfo;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct MatchResult {
    pub repo_path: String,
    pub matched_identity_id: Option<String>,
    pub matched_rule_id: Option<String>,
    pub rule_type: Option<String>,
    pub rule_value: Option<String>,
    pub is_mismatch: bool,
}

/// Resolve the best-matching identity for a single repo based on rules (priority order).
/// Returns None if no rule matches.
pub fn resolve_identity(
    repo: &RepoInfo,
    rules: &[IdentityRule],
    _identities: &[DbIdentity],
) -> Option<(String, String, String, String)> {
    // Sort rules by priority descending (highest first)
    let mut sorted_rules: Vec<&IdentityRule> = rules.iter().collect();
    sorted_rules.sort_by(|a, b| b.priority.cmp(&a.priority));

    for rule in sorted_rules {
        let matched = match rule.rule_type.as_str() {
            "path_prefix" => repo.path.starts_with(&rule.value),
            "remote_domain" => repo
                .remote_url
                .as_ref()
                .map(|u| u.contains(&rule.value))
                .unwrap_or(false),
            "remote_org" => repo
                .remote_url
                .as_ref()
                .map(|u| u.contains(&rule.value))
                .unwrap_or(false),
            _ => false,
        };

        if matched {
            return Some((
                rule.identity_id.clone(),
                rule.id.clone(),
                rule.rule_type.clone(),
                rule.value.clone(),
            ));
        }
    }

    None
}

/// Batch resolve identities for all repos, detecting mismatches.
/// A mismatch occurs when the repo's current git config (name/email) doesn't match
/// the identity that the rules say it should use.
pub fn resolve_all(
    repos: &[RepoInfo],
    rules: &[IdentityRule],
    identities: &[DbIdentity],
) -> Vec<MatchResult> {
    repos
        .iter()
        .filter_map(|repo| {
            let resolution = resolve_identity(repo, rules, identities);

            match resolution {
                Some((identity_id, rule_id, rule_type, rule_value)) => {
                    // Check if current git config matches the expected identity
                    let expected = identities.iter().find(|i| i.id == identity_id);
                    let is_mismatch = expected
                        .map(|id| {
                            id.git_name != repo.git_name || id.git_email != repo.git_email
                        })
                        .unwrap_or(false);

                    Some(MatchResult {
                        repo_path: repo.path.clone(),
                        matched_identity_id: Some(identity_id),
                        matched_rule_id: Some(rule_id),
                        rule_type: Some(rule_type),
                        rule_value: Some(rule_value),
                        is_mismatch,
                    })
                }
                None => None, // No rule matched, skip
            }
        })
        .collect()
}
