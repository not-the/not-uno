export default function Toast({ data, timed=true }) {
    const classes = ["toast", timed?"toast_timed":""].join(" ");
    return (
        <div className={classes}>
            <div className="inner">
                <h3>{data.title}</h3>
                <p>{data?.msg}</p>
            </div>

            {
                timed ?
                <div className="toast_time_bar" style={{ "animationDuration": "6s" }}/>
                : null
            }
        </div>
    )
}