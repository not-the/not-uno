export default function UserAvatar({ avatar }) {
    return (
        <img src={`/avatars/${avatar ?? "balloon"}.png`} className="avatar" alt="" />
    )
}
